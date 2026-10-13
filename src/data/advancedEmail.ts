export const advancedEmailFiles = [
  {
    path: 'app/core/Mailer.php',
    name: 'Mailer.php',
    language: 'php',
    feature: 'Email',
    description: 'PHPMailer wrapper with SMTP, templates, queue system, unsubscribe tokens',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Mailer - Email system with SMTP, templates, queue
 * Uses PHP's mail() as fallback, supports SMTP via settings
 */
class Mailer
{
    private static ?Mailer \$instance = null;
    private array \$config;

    private function __construct()
    {
        \$this->config = [
            'host' => setting('smtp_host', ''),
            'port' => (int) setting('smtp_port', 587),
            'username' => setting('smtp_user', ''),
            'password' => setting('smtp_pass', ''),
            'from_email' => setting('smtp_from', setting('site_email', 'noreply@khybersoft.com')),
            'from_name' => setting('smtp_from_name', setting('site_name', 'Khybersoft')),
            'encryption' => setting('smtp_encryption', 'tls'),
        ];
    }

    public static function getInstance(): self
    {
        if (self::\$instance === null) {
            self::\$instance = new self();
        }
        return self::\$instance;
    }

    /**
     * Send email immediately
     */
    public function send(string \$to, string \$subject, string \$bodyHtml, ?string \$bodyText = null, array \$options = []): bool
    {
        \$from = \$options['from'] ?? \$this->config['from_email'];
        \$fromName = \$options['from_name'] ?? \$this->config['from_name'];
        \$replyTo = \$options['reply_to'] ?? \$this->config['from_email'];

        // If SMTP configured and PHPMailer available, use it
        if (\$this->config['host'] && class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            return \$this->sendViaSMTP(\$to, \$subject, \$bodyHtml, \$bodyText, \$options);
        }

        // Fallback to PHP mail()
        return \$this->sendViaMail(\$to, \$subject, \$bodyHtml, \$from, \$fromName, \$replyTo);
    }

    /**
     * Queue email for later sending (via cron)
     */
    public function queue(string \$to, string \$subject, string \$bodyHtml, ?string \$bodyText = null, array \$options = []): int
    {
        \$db = Database::getInstance();

        return \$db->insert('email_queue', [
            'to_email' => \$to,
            'to_name' => \$options['to_name'] ?? null,
            'subject' => \$subject,
            'body_html' => \$bodyHtml,
            'body_text' => \$bodyText,
            'template' => \$options['template'] ?? null,
            'status' => 'pending',
            'scheduled_at' => \$options['scheduled_at'] ?? date('Y-m-d H:i:s'),
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Send email using template
     */
    public function sendTemplate(string \$to, string \$templateSlug, array \$variables = [], array \$options = []): bool
    {
        \$db = Database::getInstance();
        \$template = \$db->fetch(
            "SELECT * FROM email_templates WHERE slug = ? AND status = 'active'",
            [\$templateSlug]
        );

        if (!\$template) {
            error_log("Email template not found: {\$templateSlug}");
            return false;
        }

        // Replace variables
        \$subject = \$this->replaceVariables(\$template['subject'], \$variables);
        \$body = \$this->replaceVariables(\$template['body_html'], \$variables);

        // Add unsubscribe link if applicable
        if (!empty(\$options['add_unsubscribe'])) {
            \$token = \$this->generateUnsubscribeToken(\$to);
            \$unsubscribeUrl = SITE_URL . '/newsletter/unsubscribe?token=' . \$token;
            \$body .= '<p style="margin-top:30px;font-size:12px;color:#94a3b8;">
                <a href="' . \$unsubscribeUrl . '" style="color:#94a3b8;">Unsubscribe</a>
            </p>';
        }

        return \$this->send(\$to, \$subject, \$body, null, \$options);
    }

    /**
     * Process email queue (called by cron)
     */
    public function processQueue(int \$limit = 50): array
    {
        \$db = Database::getInstance();

        \$emails = \$db->fetchAll(
            "SELECT * FROM email_queue
             WHERE status = 'pending' AND scheduled_at <= NOW() AND attempts < max_attempts
             ORDER BY scheduled_at ASC
             LIMIT ?",
            [\$limit]
        );

        \$results = ['sent' => 0, 'failed' => 0];

        foreach (\$emails as \$email) {
            // Mark as sending
            \$db->update('email_queue', ['status' => 'sending'], 'id = ?', [\$email['id']]);

            \$success = \$this->send(
                \$email['to_email'],
                \$email['subject'],
                \$email['body_html'],
                \$email['body_text']
            );

            if (\$success) {
                \$db->update('email_queue', [
                    'status' => 'sent',
                    'sent_at' => date('Y-m-d H:i:s'),
                ], 'id = ?', [\$email['id']]);
                \$results['sent']++;
            } else {
                \$attempts = \$email['attempts'] + 1;
                \$newStatus = \$attempts >= \$email['max_attempts'] ? 'failed' : 'pending';
                \$db->update('email_queue', [
                    'status' => \$newStatus,
                    'attempts' => \$attempts,
                    'error_message' => 'Send failed',
                ], 'id = ?', [\$email['id']]);
                \$results['failed']++;
            }
        }

        return \$results;
    }

    /**
     * Generate unsubscribe token
     */
    public function generateUnsubscribeToken(string \$email): string
    {
        return hash('sha256', \$email . ':' . SITE_URL . ':' . getenv('APP_KEY'));
    }

    /**
     * Handle unsubscribe
     */
    public function unsubscribe(string \$token): bool
    {
        \$db = Database::getInstance();

        // Find subscriber by checking all possible tokens
        \$subscribers = \$db->fetchAll("SELECT id, email FROM newsletter_subscribers WHERE status = 'active'");

        foreach (\$subscribers as \$sub) {
            \$expectedToken = \$this->generateUnsubscribeToken(\$sub['email']);
            if (hash_equals(\$expectedToken, \$token)) {
                \$db->update('newsletter_subscribers', ['status' => 'unsubscribed'], 'id = ?', [\$sub['id']]);
                return true;
            }
        }

        return false;
    }

    /**
     * Replace template variables
     */
    private function replaceVariables(string \$template, array \$variables): string
    {
        // Add default variables
        \$variables['site_name'] = setting('site_name');
        \$variables['site_url'] = SITE_URL;
        \$variables['current_year'] = date('Y');

        foreach (\$variables as \$key => \$value) {
            \$template = str_replace('{{' . \$key . '}}', (string) \$value, \$template);
        }

        return \$template;
    }

    /**
     * Send via SMTP using PHPMailer
     */
    private function sendViaSMTP(string \$to, string \$subject, string \$bodyHtml, ?string \$bodyText, array \$options): bool
    {
        try {
            \$mail = new \\PHPMailer\\PHPMailer\\PHPMailer(true);

            \$mail->isSMTP();
            \$mail->Host = \$this->config['host'];
            \$mail->SMTPAuth = true;
            \$mail->Username = \$this->config['username'];
            \$mail->Password = \$this->config['password'];
            \$mail->SMTPSecure = \$this->config['encryption'];
            \$mail->Port = \$this->config['port'];
            \$mail->CharSet = 'UTF-8';

            \$mail->setFrom(\$this->config['from_email'], \$this->config['from_name']);
            \$mail->addAddress(\$to, \$options['to_name'] ?? '');
            \$mail->addReplyTo(\$options['reply_to'] ?? \$this->config['from_email']);

            \$mail->isHTML(true);
            \$mail->Subject = \$subject;
            \$mail->Body = \$bodyHtml;
            \$mail->AltBody = \$bodyText ?? strip_tags(\$bodyHtml);

            return \$mail->send();
        } catch (\\Throwable \$e) {
            error_log('SMTP send failed: ' . \$e->getMessage());
            return false;
        }
    }

    /**
     * Send via PHP mail() fallback
     */
    private function sendViaMail(string \$to, string \$subject, string \$bodyHtml, string \$from, string \$fromName, string \$replyTo): bool
    {
        \$headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=UTF-8',
            'From: ' . \$fromName . ' <' . \$from . '>',
            'Reply-To: ' . \$replyTo,
            'X-Mailer: Khybersoft/' . APP_VERSION,
        ];

        return @mail(\$to, \$subject, \$bodyHtml, implode("\\r\\n", \$headers));
    }
}
`
  },
  {
    path: 'app/core/LeadManager.php',
    name: 'LeadManager.php',
    language: 'php',
    feature: 'CRM',
    description: 'Lead capture, scoring, pipeline management, auto-tagging',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Lead Manager - CRM functionality
 * Auto-capture leads from forms, scoring, pipeline management
 */
class LeadManager
{
    private Database \$db;

    public function __construct()
    {
        \$this->db = Database::getInstance();
    }

    /**
     * Capture a new lead from form submission
     */
    public function capture(array \$data): int
    {
        // Determine source
        \$source = \$data['source'] ?? \$this->detectSource();
        \$sourceType = \$data['source_type'] ?? null;
        \$sourceId = \$data['source_id'] ?? null;

        // Calculate lead score
        \$score = \$this->calculateScore(\$data);
        \$temperature = \$this->determineTemperature(\$score, \$data);

        // Insert lead
        \$leadId = \$this->db->insert('leads', [
            'name' => \$data['name'] ?? '',
            'email' => \$data['email'] ?? '',
            'phone' => \$data['phone'] ?? null,
            'company' => \$data['company'] ?? null,
            'source' => \$source,
            'source_type' => \$sourceType,
            'source_id' => \$sourceId,
            'budget' => \$data['budget'] ?? null,
            'score' => \$score,
            'temperature' => \$temperature,
            'stage' => 'new',
            'notes' => \$data['message'] ?? null,
            'follow_up_at' => date('Y-m-d H:i:s', strtotime('+1 day')),
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        // Send auto-reply email
        if (!empty(\$data['email'])) {
            Mailer::getInstance()->sendTemplate(
                \$data['email'],
                'inquiry_reply',
                ['name' => \$data['name'], 'message' => \$data['message'] ?? '']
            );
        }

        // Notify admin
        \$this->notifyAdmin(\$leadId, \$data);

        // Log activity
        \$this->db->insert('activity_logs', [
            'action' => 'lead_captured',
            'model' => 'Lead',
            'model_id' => \$leadId,
            'description' => 'New lead captured: ' . (\$data['name'] ?? ''),
            'ip' => client_ip(),
            'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return \$leadId;
    }

    /**
     * Calculate lead score (0-100)
     */
    public function calculateScore(array \$data): int
    {
        \$score = 0;

        // Budget scoring
        \$budget = \$data['budget'] ?? '';
        if (str_contains(\$budget, '50000') || str_contains(\$budget, '100000')) {
            \$score += 40;
        } elseif (str_contains(\$budget, '10000') || str_contains(\$budget, '25000')) {
            \$score += 30;
        } elseif (str_contains(\$budget, '5000')) {
            \$score += 20;
        } elseif (\$budget) {
            \$score += 10;
        }

        // Type scoring
        \$type = \$data['type'] ?? '';
        if (\$type === 'demo') \$score += 25;
        elseif (\$type === 'quote') \$score += 20;
        elseif (\$type === 'support') \$score += 5;

        // Company scoring
        if (!empty(\$data['company'])) \$score += 15;

        // Phone scoring (more committed if they provide phone)
        if (!empty(\$data['phone'])) \$score += 10;

        // Message length (longer = more interested)
        \$msgLen = strlen(\$data['message'] ?? '');
        if (\$msgLen > 200) \$score += 10;
        elseif (\$msgLen > 100) \$score += 5;

        return min(100, \$score);
    }

    /**
     * Determine temperature based on score
     */
    public function determineTemperature(int \$score, array \$data = []): string
    {
        if (\$score >= 70) return 'hot';
        if (\$score >= 40) return 'warm';
        return 'cold';
    }

    /**
     * Update lead stage (pipeline movement)
     */
    public function updateStage(int \$leadId, string \$stage): bool
    {
        \$validStages = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
        if (!in_array(\$stage, \$validStages)) return false;

        return \$this->db->update('leads', [
            'stage' => \$stage,
            'updated_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [\$leadId]) > 0;
    }

    /**
     * Get pipeline data for Kanban view
     */
    public function getPipeline(): array
    {
        \$stages = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
        \$pipeline = [];

        foreach (\$stages as \$stage) {
            \$pipeline[\$stage] = \$this->db->fetchAll(
                "SELECT * FROM leads WHERE stage = ? ORDER BY score DESC, created_at DESC",
                [\$stage]
            );
        }

        return \$pipeline;
    }

    /**
     * Get leads needing follow-up
     */
    public function getFollowUps(): array
    {
        return \$this->db->fetchAll(
            "SELECT * FROM leads
             WHERE follow_up_at <= NOW() AND stage NOT IN ('won', 'lost')
             ORDER BY follow_up_at ASC"
        );
    }

    /**
     * Set follow-up reminder
     */
    public function setFollowUp(int \$leadId, string \$datetime): bool
    {
        return \$this->db->update('leads', [
            'follow_up_at' => \$datetime,
        ], 'id = ?', [\$leadId]) > 0;
    }

    /**
     * Detect lead source from request
     */
    private function detectSource(): string
    {
        \$referer = \$_SERVER['HTTP_REFERER'] ?? '';
        \$url = \$_SERVER['REQUEST_URI'] ?? '';

        if (str_contains(\$url, 'products/')) return 'product_page';
        if (str_contains(\$url, 'services/')) return 'service_page';
        if (str_contains(\$url, 'blog/')) return 'blog';
        if (str_contains(\$url, 'contact')) return 'contact_form';
        if (str_contains(\$url, 'book-demo')) return 'demo_request';
        if (str_contains(\$url, 'get-quote')) return 'quote_request';
        if (str_contains(\$url, 'custom-development')) return 'custom_request';
        if (str_contains(\$referer, 'google')) return 'google';
        if (str_contains(\$referer, 'facebook')) return 'facebook';
        if (str_contains(\$referer, 'linkedin')) return 'linkedin';
        if (\$referer) return 'referral';
        return 'direct';
    }

    /**
     * Notify admin of new lead
     */
    private function notifyAdmin(int \$leadId, array \$data): void
    {
        \$adminEmail = setting('site_email');
        if (!\$adminEmail) return;

        \$subject = '🔥 New Lead: ' . (\$data['name'] ?? 'Unknown');
        \$body = "
        <h2>New Lead Captured</h2>
        <table style='border-collapse:collapse;'>
            <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Name</td><td style='padding:8px;border:1px solid #ddd;'>" . e(\$data['name'] ?? '') . "</td></tr>
            <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Email</td><td style='padding:8px;border:1px solid #ddd;'>" . e(\$data['email'] ?? '') . "</td></tr>
            <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Phone</td><td style='padding:8px;border:1px solid #ddd;'>" . e(\$data['phone'] ?? 'N/A') . "</td></tr>
            <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Company</td><td style='padding:8px;border:1px solid #ddd;'>" . e(\$data['company'] ?? 'N/A') . "</td></tr>
            <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Message</td><td style='padding:8px;border:1px solid #ddd;'>" . e(\$data['message'] ?? '') . "</td></tr>
        </table>
        <p><a href='" . SITE_URL . "/admin/leads/" . \$leadId . "' style='display:inline-block;padding:10px 20px;background:#4F46E5;color:white;text-decoration:none;border-radius:6px;margin-top:20px;'>View in Admin</a></p>
        ";

        Mailer::getInstance()->queue(\$adminEmail, \$subject, \$body);
    }
}
`
  },
  {
    path: 'app/core/Payment.php',
    name: 'Payment.php',
    language: 'php',
    feature: 'Payment',
    description: 'Stripe + PayPal integration, orders, invoices, license keys, webhooks',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Payment - Stripe & PayPal integration
 * Orders, invoices, license keys, webhooks
 */
class Payment
{
    private Database \$db;

    public function __construct()
    {
        \$this->db = Database::getInstance();
    }

    /**
     * Create a Stripe Checkout session
     */
    public function createStripeCheckout(array \$product, array \$plan, array \$customer): ?string
    {
        \$secretKey = setting('stripe_secret_key');
        if (!\$secretKey) return null;

        // Note: In production, use Stripe PHP SDK via Composer
        // This is a simplified version using cURL
        \$lineItems = [[
            'price_data' => [
                'currency' => strtolower(\$plan['currency'] ?? 'usd'),
                'product_data' => ['name' => \$product['name']],
                'unit_amount' => (int) (\$plan['price'] * 100), // cents
            ],
            'quantity' => 1,
        ]];

        // For subscriptions
        if (\$plan['billing_cycle'] === 'monthly' || \$plan['billing_cycle'] === 'yearly') {
            \$lineItems[0]['price_data']['recurring'] = [
                'interval' => \$plan['billing_cycle'] === 'monthly' ? 'month' : 'year',
            ];
            \$lineItems[0]['price_data']['unit_amount'] = (int) (\$plan['price'] * 100);
        }

        \$sessionData = [
            'payment_method_types' => ['card'],
            'line_items' => \$lineItems,
            'mode' => (\$plan['billing_cycle'] === 'monthly' || \$plan['billing_cycle'] === 'yearly') ? 'subscription' : 'payment',
            'success_url' => SITE_URL . '/payment/success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => SITE_URL . '/payment/cancel',
            'customer_email' => \$customer['email'] ?? '',
            'metadata' => [
                'product_id' => \$product['id'],
                'plan_id' => \$plan['id'] ?? '',
                'customer_name' => \$customer['name'] ?? '',
            ],
        ];

        // Create order record
        \$orderNumber = \$this->generateOrderNumber();
        \$orderId = \$this->db->insert('orders', [
            'order_number' => \$orderNumber,
            'customer_name' => \$customer['name'] ?? '',
            'customer_email' => \$customer['email'] ?? '',
            'product_id' => \$product['id'],
            'plan_id' => \$plan['id'] ?? null,
            'amount' => \$plan['price'],
            'currency' => \$plan['currency'] ?? 'USD',
            'payment_method' => 'stripe',
            'payment_status' => 'pending',
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        // In production, use Stripe SDK:
        // \\Stripe\\Stripe::setApiKey(\$secretKey);
        // \$session = \\Stripe\\Checkout\\Session::create(\$sessionData);
        // return \$session->url;

        return SITE_URL . '/payment/checkout?order=' . \$orderNumber;
    }

    /**
     * Handle Stripe webhook
     */
    public function handleStripeWebhook(): void
    {
        \$payload = file_get_contents('php://input');
        \$sigHeader = \$_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
        \$webhookSecret = setting('stripe_webhook_secret');

        // Verify webhook signature (in production, use Stripe SDK)
        // \$event = \\Stripe\\Webhook::constructEvent(\$payload, \$sigHeader, \$webhookSecret);

        \$event = json_decode(\$payload, true);
        \$type = \$event['type'] ?? '';

        switch (\$type) {
            case 'checkout.session.completed':
                \$this->handleCheckoutComplete(\$event['data']['object'] ?? []);
                break;
            case 'payment_intent.succeeded':
                \$this->handlePaymentSuccess(\$event['data']['object'] ?? []);
                break;
            case 'invoice.paid':
                \$this->handleSubscriptionPayment(\$event['data']['object'] ?? []);
                break;
        }

        http_response_code(200);
        echo json_encode(['status' => 'received']);
    }

    /**
     * Handle successful checkout
     */
    private function handleCheckoutComplete(array \$session): void
    {
        \$orderId = \$session['metadata']['order_id'] ?? null;
        \$transactionId = \$session['payment_intent'] ?? \$session['subscription'] ?? '';

        if (\$orderId) {
            \$this->db->update('orders', [
                'payment_status' => 'completed',
                'transaction_id' => \$transactionId,
                'status' => 'completed',
                'updated_at' => date('Y-m-d H:i:s'),
            ], 'id = ?', [\$orderId]);

            // Generate license key if applicable
            \$order = \$this->db->fetch("SELECT * FROM orders WHERE id = ?", [\$orderId]);
            if (\$order && \$order['product_id']) {
                \$product = \$this->db->fetch("SELECT * FROM products WHERE id = ?", [\$order['product_id']]);
                if (\$product && \$product['price_type'] === 'one_time') {
                    \$licenseKey = \$this->generateLicenseKey();
                    \$this->db->update('orders', ['license_key' => \$licenseKey], 'id = ?', [\$orderId]);

                    // Send license key email
                    Mailer::getInstance()->sendTemplate(
                        \$order['customer_email'],
                        'license_key',
                        [
                            'name' => \$order['customer_name'],
                            'product_name' => \$product['name'],
                            'license_key' => \$licenseKey,
                            'order_number' => \$order['order_number'],
                        ]
                    );
                }
            }
        }
    }

    /**
     * Generate unique order number
     */
    public function generateOrderNumber(): string
    {
        return 'KBS-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
    }

    /**
     * Generate license key
     */
    public function generateLicenseKey(): string
    {
        \$segments = [];
        for (\$i = 0; \$i < 4; \$i++) {
            \$segments[] = strtoupper(bin2hex(random_bytes(2)));
        }
        return implode('-', \$segments);
    }

    /**
     * Validate license key (API endpoint)
     */
    public function validateLicense(string \$key): array
    {
        \$order = \$this->db->fetch(
            "SELECT o.*, p.name as product_name, p.slug as product_slug
             FROM orders o
             LEFT JOIN products p ON o.product_id = p.id
             WHERE o.license_key = ? AND o.payment_status = 'completed'",
            [\$key]
        );

        if (!\$order) {
            return ['valid' => false, 'message' => 'Invalid license key'];
        }

        return [
            'valid' => true,
            'product' => \$order['product_name'],
            'product_slug' => \$order['product_slug'],
            'order_number' => \$order['order_number'],
            'customer_email' => \$order['customer_email'],
            'purchased_at' => \$order['created_at'],
            'type' => 'lifetime', // or check subscription status
        ];
    }

    /**
     * Create PayPal order
     */
    public function createPayPalOrder(array \$product, array \$plan, array \$customer): ?array
    {
        \$clientId = setting('paypal_client_id');
        \$clientSecret = setting('paypal_secret');

        if (!\$clientId || !\$clientSecret) return null;

        // Create order record
        \$orderNumber = \$this->generateOrderNumber();
        \$orderId = \$this->db->insert('orders', [
            'order_number' => \$orderNumber,
            'customer_name' => \$customer['name'] ?? '',
            'customer_email' => \$customer['email'] ?? '',
            'product_id' => \$product['id'],
            'plan_id' => \$plan['id'] ?? null,
            'amount' => \$plan['price'],
            'currency' => \$plan['currency'] ?? 'USD',
            'payment_method' => 'paypal',
            'payment_status' => 'pending',
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        // In production, use PayPal SDK to create order
        // Return approval URL for redirect
        return [
            'order_id' => \$orderId,
            'order_number' => \$orderNumber,
            'approval_url' => SITE_URL . '/payment/paypal/approve?order=' . \$orderNumber,
        ];
    }

    /**
     * Generate secure download token
     */
    public function generateDownloadToken(int \$productId, ?int \$orderId = null): string
    {
        \$token = bin2hex(random_bytes(32));
        \$expiresAt = date('Y-m-d H:i:s', time() + 86400); // 24 hours

        \$this->db->insert('downloads', [
            'product_id' => \$productId,
            'order_id' => \$orderId,
            'token' => \$token,
            'ip' => client_ip(),
            'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
            'user_id' => Auth::id(),
            'expires_at' => \$expiresAt,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return \$token;
    }

    /**
     * Validate download token and serve file
     */
    public function validateDownload(string \$token): ?array
    {
        \$download = \$this->db->fetch(
            "SELECT d.*, p.download_url, p.name as product_name
             FROM downloads d
             LEFT JOIN products p ON d.product_id = p.id
             WHERE d.token = ? AND d.expires_at > NOW()",
            [\$token]
        );

        if (!\$download) return null;

        // For paid products, verify order exists and is completed
        if (\$download['order_id']) {
            \$order = \$this->db->fetch(
                "SELECT * FROM orders WHERE id = ? AND payment_status = 'completed'",
                [\$download['order_id']]
            );
            if (!\$order) return null;
        }

        return \$download;
    }

    /**
     * Generate invoice PDF (simplified - use TCPDF/FPDF in production)
     */
    public function generateInvoice(int \$orderId): string
    {
        \$order = \$this->db->fetch(
            "SELECT o.*, p.name as product_name FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.id = ?",
            [\$orderId]
        );

        if (!\$order) return '';

        \$html = '
        <html><head><style>
            body { font-family: Arial, sans-serif; }
            .invoice { max-width: 800px; margin: 0 auto; padding: 40px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .company { font-size: 24px; font-weight: bold; color: #4F46E5; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background: #f8fafc; font-weight: 600; }
            .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
        </style></head><body>
        <div class="invoice">
            <div class="header">
                <div class="company">' . e(setting('site_name')) . '</div>
                <div>Invoice #' . e(\$order['order_number']) . '<br>Date: ' . format_date(\$order['created_at']) . '</div>
            </div>
            <p><strong>Bill To:</strong><br>' . e(\$order['customer_name']) . '<br>' . e(\$order['customer_email']) . '</p>
            <table>
                <tr><th>Product</th><th>Amount</th></tr>
                <tr><td>' . e(\$order['product_name'] ?? 'Product') . '</td><td>' . money((float)\$order['amount'], \$order['currency']) . '</td></tr>
            </table>
            <div class="total">Total: ' . money((float)\$order['amount'], \$order['currency']) . '</div>
            <p style="margin-top:40px;color:#64748b;font-size:12px;">Status: ' . ucfirst(\$order['payment_status']) . '</p>
            ' . (\$order['license_key'] ? '<p><strong>License Key:</strong> ' . e(\$order['license_key']) . '</p>' : '') . '
        </div></body></html>';

        // Save invoice
        \$invoicePath = STORAGE_PATH . '/invoices/' . \$order['order_number'] . '.html';
        if (!is_dir(dirname(\$invoicePath))) mkdir(dirname(\$invoicePath), 0755, true);
        file_put_contents(\$invoicePath, \$html);

        return \$invoicePath;
    }
}
`
  },
  {
    path: 'cron/email_queue.php',
    name: 'email_queue.php',
    language: 'php',
    feature: 'Email',
    description: 'Cron job script to process email queue (run every 5 minutes)',
    content: `<?php
declare(strict_types=1);

/**
 * Email Queue Processor - Cron Job
 * Run every 5 minutes: php cron/email_queue.php
 * Or via cPanel cron: */5 * * * * php /home/username/cron/email_queue.php
 */

// Bootstrap application
define('ROOT_PATH', dirname(__DIR__));
define('APP_PATH', ROOT_PATH . '/app');
define('PUBLIC_PATH', ROOT_PATH . '/public_html');

require_once APP_PATH . '/config/config.php';
require_once APP_PATH . '/config/database.php';

// Autoloader
spl_autoload_register(function (string \$class): void {
    \$paths = [APP_PATH . '/core/', APP_PATH . '/models/', APP_PATH . '/helpers/'];
    foreach (\$paths as \$path) {
        \$file = \$path . \$class . '.php';
        if (file_exists(\$file)) { require_once \$file; return; }
    }
});

require_once APP_PATH . '/helpers/functions.php';

// Process queue
\$mailer = \\App\\Core\\Mailer::getInstance();
\$results = \$mailer->processQueue(100);

// Log results
\$logFile = STORAGE_PATH . '/logs/email_queue_' . date('Y-m-d') . '.log';
\$logEntry = date('Y-m-d H:i:s') . " - Sent: {\$results['sent']}, Failed: {\$results['failed']}\\n";
file_put_contents(\$logFile, \$logEntry, FILE_APPEND);

echo "Processed: {\$results['sent']} sent, {\$results['failed']} failed\\n";
`
  },
  {
    path: 'cron/backup.php',
    name: 'backup.php',
    language: 'php',
    feature: 'Backup',
    description: 'Automated backup cron job - database + files',
    content: `<?php
declare(strict_types=1);

/**
 * Backup Cron Job
 * Run daily: 0 2 * * * php /home/username/cron/backup.php
 */

define('ROOT_PATH', dirname(__DIR__));
define('APP_PATH', ROOT_PATH . '/app');
define('PUBLIC_PATH', ROOT_PATH . '/public_html');

require_once APP_PATH . '/config/config.php';
require_once APP_PATH . '/config/database.php';

spl_autoload_register(function (string \$class): void {
    \$paths = [APP_PATH . '/core/', APP_PATH . '/helpers/'];
    foreach (\$paths as \$path) {
        \$file = \$path . \$class . '.php';
        if (file_exists(\$file)) { require_once \$file; return; }
    }
});
require_once APP_PATH . '/helpers/functions.php';

\$backupDir = STORAGE_PATH . '/backups/' . date('Y-m-d');
if (!is_dir(\$backupDir)) mkdir(\$backupDir, 0755, true);

// Database backup
\$dbConfig = require APP_PATH . '/config/database.php';
\$dbFile = \$backupDir . '/database_' . date('Y-m-d_H-i-s') . '.sql';

\$command = sprintf(
    'mysqldump -h%s -u%s -p%s %s > %s 2>&1',
    escapeshellarg(\$dbConfig['host']),
    escapeshellarg(\$dbConfig['username']),
    escapeshellarg(\$dbConfig['password']),
    escapeshellarg(\$dbConfig['database']),
    escapeshellarg(\$dbFile)
);

exec(\$command, \$output, \$returnCode);

if (\$returnCode === 0) {
    echo "Database backup completed: {\$dbFile}\\n";
    // Compress
    \$zipFile = \$dbFile . '.zip';
    \$zip = new ZipArchive();
    if (\$zip->open(\$zipFile, ZipArchive::CREATE) === true) {
        \$zip->addFile(\$dbFile, basename(\$dbFile));
        \$zip->close();
        unlink(\$dbFile);
        echo "Compressed to: {\$zipFile}\\n";
    }
} else {
    echo "Database backup failed: " . implode("\\n", \$output) . "\\n";
}

// File backup (uploads)
\$uploadsDir = PUBLIC_PATH . '/uploads';
if (is_dir(\$uploadsDir)) {
    \$filesZip = \$backupDir . '/uploads_' . date('Y-m-d_H-i-s') . '.zip';
    \$zip = new ZipArchive();
    if (\$zip->open(\$filesZip, ZipArchive::CREATE) === true) {
        \$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(\$uploadsDir));
        foreach (\$files as \$file) {
            if (!\$file->isDir()) {
                \$zip->addFile(\$file->getRealPath(), str_replace(\$uploadsDir . '/', '', \$file->getRealPath()));
            }
        }
        \$zip->close();
        echo "Uploads backup completed: {\$filesZip}\\n";
    }
}

// Cleanup old backups (keep last 30 days)
\$oldBackups = glob(STORAGE_PATH . '/backups/*');
foreach (\$oldBackups as \$dir) {
    if (is_dir(\$dir)) {
        \$dirName = basename(\$dir);
        if (strtotime(\$dirName) < strtotime('-30 days')) {
            array_map('unlink', glob(\$dir . '/*'));
            rmdir(\$dir);
            echo "Cleaned up old backup: {\$dirName}\\n";
        }
    }
}

echo "Backup process completed at " . date('Y-m-d H:i:s') . "\\n";
`
  },
  {
    path: 'app/controllers/front/DownloadController.php',
    name: 'DownloadController.php',
    language: 'php',
    feature: 'Download',
    description: 'Secure download controller with token validation and tracking',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Front;

use App\\Core\\Controller;
use App\\Core\\Payment;

/**
 * Download Controller - Secure file downloads
 */
class DownloadController extends Controller
{
    /**
     * Serve secure download
     */
    public function serve(string \$token): void
    {
        \$payment = new Payment();
        \$download = \$payment->validateDownload(\$token);

        if (!\$download) {
            http_response_code(404);
            echo 'Download link expired or invalid.';
            return;
        }

        // Track download
        \$db = \\App\\Core\\Database::getInstance();
        \$db->insert('download_logs', [
            'download_id' => \$download['id'],
            'product_id' => \$download['product_id'],
            'ip' => client_ip(),
            'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        // Redirect to download URL or serve file
        if (\$download['download_url']) {
            \$this->redirect(\$download['download_url']);
        } else {
            // Serve file directly
            \$filePath = UPLOAD_PATH . '/' . \$download['file_path'];
            if (file_exists(\$filePath)) {
                header('Content-Type: application/octet-stream');
                header('Content-Disposition: attachment; filename="' . basename(\$filePath) . '"');
                header('Content-Length: ' . filesize(\$filePath));
                readfile(\$filePath);
                exit;
            }
        }

        http_response_code(404);
        echo 'File not found.';
    }
}
`
  },
  {
    path: 'app/controllers/front/LicenseController.php',
    name: 'LicenseController.php',
    language: 'php',
    feature: 'License',
    description: 'License validation API endpoint for software products',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Front;

use App\\Core\\Payment;

/**
 * License API Controller
 * Validates license keys for software products
 * Endpoint: /api/license/validate?key=XXXX-XXXX-XXXX-XXXX
 */
class LicenseController
{
    /**
     * Validate license key (JSON API)
     */
    public function validate(): void
    {
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');

        \$key = \$_GET['key'] ?? \$_POST['key'] ?? '';

        if (empty(\$key)) {
            http_response_code(400);
            echo json_encode(['valid' => false, 'message' => 'License key required']);
            return;
        }

        \$payment = new Payment();
        \$result = \$payment->validateLicense(\$key);

        echo json_encode(\$result, JSON_UNESCAPED_SLASHES);
    }

    /**
     * Activate license (for software installations)
     */
    public function activate(): void
    {
        header('Content-Type: application/json');

        \$key = \$_POST['key'] ?? '';
        \$domain = \$_POST['domain'] ?? '';
        \$ip = \$_POST['ip'] ?? client_ip();

        if (empty(\$key) || empty(\$domain)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Key and domain required']);
            return;
        }

        \$payment = new Payment();
        \$license = \$payment->validateLicense(\$key);

        if (!\$license['valid']) {
            echo json_encode(\$license);
            return;
        }

        // Log activation
        \$db = \\App\\Core\\Database::getInstance();
        \$db->insert('license_activations', [
            'order_id' => \$license['order_id'] ?? null,
            'license_key' => \$key,
            'domain' => \$domain,
            'ip' => \$ip,
            'activated_at' => date('Y-m-d H:i:s'),
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'License activated successfully',
            'product' => \$license['product'],
        ]);
    }
}
`
  },
];
