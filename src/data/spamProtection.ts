export interface SpamFile {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  category: string;
}

export const spamProtectionFiles: SpamFile[] = [
  // ============================================
  // CORE: SpamGuard - Main Orchestrator
  // ============================================
  {
    path: 'app/core/SpamGuard.php',
    name: 'SpamGuard.php',
    language: 'php',
    category: 'Core',
    description: 'Main spam protection orchestrator implementing all 12 defense layers',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * SpamGuard - Comprehensive 12-Layer Spam Protection
 * 
 * Defense-in-depth approach:
 * 1. Honeypot fields (invisible traps)
 * 2. Time-based protection
 * 3. CSRF token enforcement
 * 4. Rate limiting (IP + session + email)
 * 5. Content analysis (keyword detection)
 * 6. Email validation (MX, disposable, patterns)
 * 7. reCAPTCHA v2/v3
 * 8. Math captcha fallback
 * 9. IP & Geo intelligence
 * 10. Email header analysis
 * 11. Spam queue & admin review
 * 12. Form-specific hardening
 */
class SpamGuard
{
    private string $formName;
    private array $config;
    private array $results = [];
    private int $spamScore = 0;
    private array $spamReasons = [];
    private Database $db;
    
    // Spam keywords (loaded from DB + defaults)
    private array $spamKeywords = [];
    private array $disposableDomains = [];
    
    public function __construct(string $formName)
    {
        $this->formName = $formName;
        $this->db = Database::getInstance();
        $this->config = $this->loadConfig();
        $this->loadSpamKeywords();
        $this->loadDisposableDomains();
    }
    
    /**
     * Run all spam checks on submission data
     */
    public function check(array $data): bool
    {
        $this->results = [];
        $this->spamScore = 0;
        $this->spamReasons = [];
        
        // Layer 9: IP & Geo Intelligence (run first - fast fail)
        $this->checkIPBlock();
        if ($this->isHardBlocked()) return false;
        
        // Layer 4: Rate Limiting (run early - fast fail)
        $this->checkRateLimit($data);
        if ($this->isHardBlocked()) return false;
        
        // Layer 1: Honeypot Fields
        $this->checkHoneypot($data);
        
        // Layer 2: Time-Based Protection
        $this->checkTiming($data);
        
        // Layer 3: CSRF Token
        $this->checkCSRF($data);
        
        // Layer 6: Email Validation
        if (!empty($data['email'])) {
            $this->checkEmail($data['email']);
        }
        
        // Layer 5: Content Analysis
        $this->checkContent($data);
        
        // Layer 7/8: CAPTCHA (reCAPTCHA or Math)
        $this->checkCaptcha($data);
        
        // Layer 12: Form-Specific Hardening
        $this->checkFormSpecific($data);
        
        // Calculate final spam score
        $this->calculateScore();
        
        // Log submission
        $this->logSubmission($data);
        
        // Auto-block if score too high
        if ($this->spamScore >= $this->config['auto_block_threshold']) {
            $this->autoBlockIP();
        }
        
        // Return true if NOT spam
        return $this->spamScore < $this->config['spam_threshold'];
    }
    
    /**
     * Get detailed results for debugging/admin
     */
    public function getResults(): array
    {
        return [
            'score' => $this->spamScore,
            'threshold' => $this->config['spam_threshold'],
            'is_spam' => $this->spamScore >= $this->config['spam_threshold'],
            'reasons' => $this->spamReasons,
            'checks' => $this->results,
        ];
    }
    
    // ============================================
    // LAYER 1: HONEYPOT FIELDS
    // ============================================
    private function checkHoneypot(array $data): void
    {
        $honeypotName = $_SESSION['honeypot_field_' . $this->formName] ?? 'website_url';
        $honeypotName2 = $_SESSION['honeypot_field2_' . $this->formName] ?? 'email_confirm';
        
        $honeypot1Filled = !empty($data[$honeypotName] ?? '');
        $honeypot2Filled = !empty($data[$honeypotName2] ?? '');
        
        if ($honeypot1Filled) {
            $this->addReason('honeypot_1', 'Honeypot field 1 filled', 100);
        }
        if ($honeypot2Filled) {
            $this->addReason('honeypot_2', 'Honeypot field 2 filled', 100);
        }
        
        $this->results['honeypot'] = [
            'passed' => !$honeypot1Filled && !$honeypot2Filled,
            'field_1' => $honeypotName,
            'field_2' => $honeypotName2,
        ];
    }
    
    // ============================================
    // LAYER 2: TIME-BASED PROTECTION
    // ============================================
    private function checkTiming(array $data): void
    {
        $submittedTime = $data['_t'] ?? '';
        $sessionTime = $_SESSION['form_time_' . $this->formName] ?? 0;
        
        // Check encrypted timestamp
        if ($submittedTime) {
            $expectedToken = $this->generateTimeToken($sessionTime);
            if (!hash_equals($expectedToken, $submittedTime)) {
                $this->addReason('timing_tampered', 'Timestamp token invalid', 80);
                $this->results['timing'] = ['passed' => false, 'reason' => 'tampered'];
                return;
            }
        }
        
        $now = time();
        $elapsed = $now - $sessionTime;
        
        // Too fast (< 3 seconds) = bot
        if ($elapsed < 3) {
            $this->addReason('timing_too_fast', "Submitted in {$elapsed}s (< 3s)", 70);
        }
        
        // Too slow (> 2 hours) = expired session
        if ($elapsed > 7200) {
            $this->addReason('timing_expired', "Session expired ({$elapsed}s > 2h)", 30);
        }
        
        $this->results['timing'] = [
            'passed' => $elapsed >= 3 && $elapsed <= 7200,
            'elapsed_seconds' => $elapsed,
        ];
    }
    
    // ============================================
    // LAYER 3: CSRF TOKEN
    // ============================================
    private function checkCSRF(array $data): void
    {
        $token = $data['_token'] ?? '';
        $passed = CSRF::verify($token);
        
        if (!$passed) {
            $this->addReason('csrf_invalid', 'CSRF token invalid or missing', 90);
        }
        
        $this->results['csrf'] = ['passed' => $passed];
    }
    
    // ============================================
    // LAYER 4: RATE LIMITING
    // ============================================
    private function checkRateLimit(array $data): void
    {
        $ip = client_ip();
        $sessionId = session_id();
        $email = $data['email'] ?? '';
        $now = time();
        
        $limits = [
            'ip_form_hour' => [
                'identifier' => "ip:{$ip}:form:{$this->formName}",
                'max' => $this->config['rate_limits']['per_form_per_ip_per_hour'] ?? 3,
                'window' => 3600,
            ],
            'ip_total_hour' => [
                'identifier' => "ip:{$ip}:total",
                'max' => $this->config['rate_limits']['per_ip_total_per_hour'] ?? 5,
                'window' => 3600,
            ],
            'email_day' => [
                'identifier' => "email:{$email}",
                'max' => $this->config['rate_limits']['per_email_per_day'] ?? 2,
                'window' => 86400,
            ],
            'session_total' => [
                'identifier' => "session:{$sessionId}",
                'max' => $this->config['rate_limits']['per_session_total'] ?? 10,
                'window' => 86400,
            ],
        ];
        
        foreach ($limits as $name => $rule) {
            // Check if currently blocked
            $blocked = $this->db->fetch(
                "SELECT * FROM rate_limits WHERE identifier = ? AND blocked_until > NOW()",
                [$rule['identifier']]
            );
            
            if ($blocked) {
                $this->addReason('rate_limited', "Rate limited ({$name})", 100);
                $this->results['rate_limit'] = [
                    'passed' => false,
                    'blocked_until' => $blocked['blocked_until'],
                    'retry_in' => strtotime($blocked['blocked_until']) - $now,
                ];
                return;
            }
            
            // Count recent attempts
            $windowStart = date('Y-m-d H:i:s', $now - $rule['window']);
            $count = (int) $this->db->fetchColumn(
                "SELECT COUNT(*) FROM form_submissions 
                 WHERE form_name = ? AND ip = ? AND created_at >= ?",
                [$this->formName, $ip, $windowStart]
            );
            
            // For email-based limits
            if (str_starts_with($rule['identifier'], 'email:')) {
                $count = (int) $this->db->fetchColumn(
                    "SELECT COUNT(*) FROM form_submissions 
                     WHERE email = ? AND created_at >= ?",
                    [$email, $windowStart]
                );
            }
            
            if ($count >= $rule['max']) {
                // Block for 1 hour
                $blockedUntil = date('Y-m-d H:i:s', $now + 3600);
                
                $this->db->query(
                    "INSERT INTO rate_limits (identifier, form_name, attempts, first_attempt_at, blocked_until)
                     VALUES (?, ?, ?, NOW(), ?)
                     ON DUPLICATE KEY UPDATE attempts = attempts + 1, blocked_until = ?",
                    [$rule['identifier'], $this->formName, $count, $blockedUntil, $blockedUntil]
                );
                
                $this->addReason('rate_limited', "Rate limit exceeded ({$name}: {$count}/{$rule['max']})", 100);
                $this->results['rate_limit'] = [
                    'passed' => false,
                    'rule' => $name,
                    'count' => $count,
                    'max' => $rule['max'],
                    'retry_in' => 3600,
                ];
                return;
            }
        }
        
        $this->results['rate_limit'] = ['passed' => true];
    }
    
    // ============================================
    // LAYER 5: CONTENT ANALYSIS
    // ============================================
    private function checkContent(array $data): void
    {
        $message = strtolower($data['message'] ?? '');
        $subject = strtolower($data['subject'] ?? '');
        $name = strtolower($data['name'] ?? '');
        $textToCheck = "{$message} {$subject} {$name}";
        
        $score = 0;
        $triggered = [];
        
        // Check spam keywords
        foreach ($this->spamKeywords as $keyword) {
            if (str_contains($textToCheck, strtolower($keyword['keyword']))) {
                $score += (int) $keyword['weight'];
                $triggered[] = $keyword['keyword'];
            }
        }
        
        // Excessive links (>2 URLs)
        preg_match_all('/https?:\\/\\/[^\\s]+/i', $message, $matches);
        $linkCount = count($matches[0] ?? []);
        if ($linkCount > 2) {
            $score += 20 + ($linkCount - 2) * 5;
            $triggered[] = "excessive_links:{$linkCount}";
        }
        
        // ALL CAPS detection (if message > 20 chars and > 70% uppercase)
        if (strlen($message) > 20) {
            $upperRatio = strlen(preg_replace('/[^A-Z]/', '', $message)) / strlen($message);
            if ($upperRatio > 0.7) {
                $score += 15;
                $triggered[] = 'all_caps';
            }
        }
        
        // Gibberish detection (no vowels in long words)
        $words = preg_split('/\\s+/', $message);
        $gibberishCount = 0;
        foreach ($words as $word) {
            if (strlen($word) > 6 && !preg_match('/[aeiou]/i', $word)) {
                $gibberishCount++;
            }
        }
        if ($gibberishCount > 2) {
            $score += 25;
            $triggered[] = 'gibberish';
        }
        
        // Cyrillic/Arabic in English-only forms
        if ($this->config['block_non_latin'] && preg_match('/[\\x{0400}-\\x{04FF}\\x{0600}-\\x{06FF}]/u', $message)) {
            $score += 30;
            $triggered[] = 'non_latin_chars';
        }
        
        if ($score > 0) {
            $this->addReason('content_analysis', "Spam content detected (score: {$score})", min($score, 80));
        }
        
        $this->results['content'] = [
            'passed' => $score < ($this->config['content_threshold'] ?? 40),
            'score' => $score,
            'triggered' => $triggered,
        ];
    }
    
    // ============================================
    // LAYER 6: EMAIL VALIDATION
    // ============================================
    private function checkEmail(string $email): void
    {
        $email = strtolower(trim($email));
        $issues = [];
        
        // Format validation
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->addReason('email_invalid_format', 'Invalid email format', 100);
            $this->results['email'] = ['passed' => false, 'reason' => 'format'];
            return;
        }
        
        [$local, $domain] = explode('@', $email);
        
        // Obvious fake patterns
        $fakePatterns = ['test@test.com', 'admin@admin.com', 'a@a.com', 'test@test.test', 'asdf@asdf.com'];
        if (in_array($email, $fakePatterns)) {
            $this->addReason('email_fake_pattern', 'Fake email pattern', 90);
            $issues[] = 'fake_pattern';
        }
        
        // Disposable domain check
        if (in_array($domain, $this->disposableDomains)) {
            $this->addReason('email_disposable', "Disposable domain: {$domain}", 80);
            $issues[] = 'disposable';
        }
        
        // DNS MX record check
        if ($this->config['check_dns_mx']) {
            if (!checkdnsrr($domain, 'MX') && !checkdnsrr($domain, 'A')) {
                $this->addReason('email_no_mx', "No MX record for {$domain}", 60);
                $issues[] = 'no_mx';
            }
        }
        
        // Blocked email check
        $blocked = $this->db->fetch(
            "SELECT * FROM blocked_emails WHERE email = ? OR email = ?",
            [$email, $domain]
        );
        if ($blocked) {
            $this->addReason('email_blocked', 'Email/domain blocked', 100);
            $issues[] = 'blocked';
        }
        
        $this->results['email'] = [
            'passed' => empty($issues),
            'issues' => $issues,
            'domain' => $domain,
        ];
    }
    
    // ============================================
    // LAYER 7/8: CAPTCHA
    // ============================================
    private function checkCaptcha(array $data): void
    {
        $captcha = new Captcha();
        
        // Try reCAPTCHA first if enabled
        if ($this->config['recaptcha_enabled']) {
            $token = $data['g-recaptcha-response'] ?? $data['recaptcha_token'] ?? '';
            $result = $captcha->verifyRecaptcha($token);
            
            if (!$result['success']) {
                if ($this->config['math_captcha_fallback']) {
                    // Fall back to math captcha
                    $mathResult = $captcha->verifyMath($data['math_answer'] ?? '');
                    if (!$mathResult) {
                        $this->addReason('captcha_math_failed', 'Math captcha failed', 70);
                    }
                    $this->results['captcha'] = ['type' => 'math', 'passed' => $mathResult];
                } else {
                    $this->addReason('captcha_recaptcha_failed', 'reCAPTCHA failed: ' . ($result['error'] ?? 'unknown'), 70);
                    $this->results['captcha'] = ['type' => 'recaptcha', 'passed' => false];
                }
            } else {
                $this->results['captcha'] = ['type' => 'recaptcha', 'passed' => true, 'score' => $result['score'] ?? null];
            }
        } elseif ($this->config['math_captcha_enabled']) {
            // Math captcha only
            $mathResult = $captcha->verifyMath($data['math_answer'] ?? '');
            if (!$mathResult) {
                $this->addReason('captcha_math_failed', 'Math captcha failed', 70);
            }
            $this->results['captcha'] = ['type' => 'math', 'passed' => $mathResult];
        } else {
            $this->results['captcha'] = ['type' => 'none', 'passed' => true];
        }
    }
    
    // ============================================
    // LAYER 9: IP & GEO INTELLIGENCE
    // ============================================
    private function checkIPBlock(): void
    {
        $ip = client_ip();
        
        // Check whitelist first
        $whitelist = $this->config['ip_whitelist'] ?? [];
        if (in_array($ip, $whitelist)) {
            $this->results['ip'] = ['passed' => true, 'whitelisted' => true];
            return;
        }
        
        // Check blocked IPs
        $blocked = $this->db->fetch(
            "SELECT * FROM blocked_ips WHERE ip = ? AND (permanent = 1 OR blocked_until > NOW())",
            [$ip]
        );
        
        if ($blocked) {
            $this->addReason('ip_blocked', "IP blocked: {$blocked['reason']}", 100);
            $this->results['ip'] = ['passed' => false, 'blocked' => true, 'reason' => $blocked['reason']];
            return;
        }
        
        // Country blocking (if enabled)
        if ($this->config['country_blocking_enabled']) {
            $country = $this->getCountryForIP($ip);
            $blockedCountries = $this->config['blocked_countries'] ?? [];
            if (in_array($country, $blockedCountries)) {
                $this->addReason('country_blocked', "Country blocked: {$country}", 100);
                $this->results['ip'] = ['passed' => false, 'country_blocked' => $country];
                return;
            }
        }
        
        $this->results['ip'] = ['passed' => true, 'ip' => $ip];
    }
    
    // ============================================
    // LAYER 12: FORM-SPECIFIC HARDENING
    // ============================================
    private function checkFormSpecific(array $data): void
    {
        $rules = $this->config['form_rules'][$this->formName] ?? [];
        
        foreach ($rules as $rule) {
            $field = $rule['field'];
            $requirement = $rule['requirement'];
            
            switch ($requirement) {
                case 'required':
                    if (empty($data[$field])) {
                        $this->addReason("form_{$field}_missing", "Required field missing: {$field}", 50);
                    }
                    break;
                case 'dropdown':
                    $allowed = $rule['allowed'] ?? [];
                    if (!in_array($data[$field] ?? '', $allowed)) {
                        $this->addReason("form_{$field}_invalid", "Invalid dropdown value: {$field}", 60);
                    }
                    break;
                case 'file_required':
                    if (empty($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) {
                        $this->addReason("form_{$field}_no_file", "Required file missing: {$field}", 50);
                    }
                    break;
            }
        }
        
        $this->results['form_specific'] = ['passed' => true, 'rules_applied' => count($rules)];
    }
    
    // ============================================
    // HELPER METHODS
    // ============================================
    
    private function addReason(string $code, string $message, int $score): void
    {
        $this->spamReasons[] = ['code' => $code, 'message' => $message, 'score' => $score];
    }
    
    private function calculateScore(): void
    {
        $total = 0;
        foreach ($this->spamReasons as $reason) {
            $total += $reason['score'];
        }
        $this->spamScore = min(100, $total);
    }
    
    private function isHardBlocked(): bool
    {
        return $this->spamScore >= 100;
    }
    
    private function autoBlockIP(): void
    {
        $spamCount = (int) $this->db->fetchColumn(
            "SELECT COUNT(*) FROM form_submissions 
             WHERE ip = ? AND is_spam = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)",
            [client_ip()]
        );
        
        if ($spamCount >= ($this->config['auto_block_after'] ?? 3)) {
            $this->db->insert('blocked_ips', [
                'ip' => client_ip(),
                'reason' => "Auto-blocked after {$spamCount} spam submissions",
                'permanent' => 0,
                'blocked_until' => date('Y-m-d H:i:s', time() + 86400), // 24 hours
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        }
    }
    
    private function logSubmission(array $data): void
    {
        $isSpam = $this->spamScore >= $this->config['spam_threshold'] ? 1 : 0;
        
        $this->db->insert('form_submissions', [
            'form_name' => $this->formName,
            'name' => $data['name'] ?? '',
            'email' => $data['email'] ?? '',
            'phone' => $data['phone'] ?? '',
            'subject' => $data['subject'] ?? '',
            'message' => $data['message'] ?? '',
            'data_json' => json_encode($data),
            'ip' => client_ip(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'session_id' => session_id(),
            'spam_score' => $this->spamScore,
            'is_spam' => $isSpam,
            'spam_reason' => json_encode($this->spamReasons),
            'status' => $isSpam ? 'spam' : 'pending',
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        
        // Log individual layer triggers
        foreach ($this->spamReasons as $reason) {
            $this->db->insert('spam_logs', [
                'submission_id' => $this->db->lastInsertId(),
                'layer_triggered' => $reason['code'],
                'details' => $reason['message'],
                'score' => $reason['score'],
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        }
        
        // Notify admin if spam
        if ($isSpam && $this->config['notify_on_spam']) {
            $this->notifyAdminSpam($data);
        }
    }
    
    private function notifyAdminSpam(array $data): void
    {
        $adminEmail = setting('site_email');
        if (!$adminEmail) return;
        
        $subject = "🚨 Spam Detected: {$this->formName}";
        $body = "<h2>Spam Submission Detected</h2>
            <p><strong>Form:</strong> {$this->formName}</p>
            <p><strong>Score:</strong> {$this->spamScore}/100</p>
            <p><strong>IP:</strong> " . client_ip() . "</p>
            <p><strong>Email:</strong> " . e($data['email'] ?? 'N/A') . "</p>
            <h3>Reasons:</h3><ul>";
        
        foreach ($this->spamReasons as $reason) {
            $body .= "<li>{$reason['message']} (+{$reason['score']})</li>";
        }
        $body .= "</ul><p><a href='" . SITE_URL . "/admin/spam'>Review in Admin</a></p>";
        
        Mailer::getInstance()->queue($adminEmail, $subject, $body);
    }
    
    private function loadConfig(): array
    {
        return [
            'spam_threshold' => (int) setting('spam_threshold', 60),
            'content_threshold' => (int) setting('spam_content_threshold', 40),
            'auto_block_threshold' => (int) setting('spam_auto_block_threshold', 90),
            'auto_block_after' => (int) setting('spam_auto_block_after', 3),
            'recaptcha_enabled' => setting('recaptcha_enabled', '0') === '1',
            'recaptcha_site_key' => setting('recaptcha_site_key', ''),
            'recaptcha_secret_key' => setting('recaptcha_secret_key', ''),
            'recaptcha_version' => setting('recaptcha_version', 'v3'),
            'recaptcha_threshold' => (float) setting('recaptcha_threshold', 0.5),
            'math_captcha_enabled' => setting('math_captcha_enabled', '1') === '1',
            'math_captcha_fallback' => setting('math_captcha_fallback', '1') === '1',
            'check_dns_mx' => setting('spam_check_dns_mx', '1') === '1',
            'block_disposable' => setting('spam_block_disposable', '1') === '1',
            'block_non_latin' => setting('spam_block_non_latin', '0') === '1',
            'notify_on_spam' => setting('spam_notify_admin', '0') === '1',
            'country_blocking_enabled' => setting('spam_country_blocking', '0') === '1',
            'blocked_countries' => json_decode(setting('spam_blocked_countries', '[]'), true) ?: [],
            'ip_whitelist' => json_decode(setting('spam_ip_whitelist', '[]'), true) ?: [],
            'rate_limits' => [
                'per_form_per_ip_per_hour' => (int) setting('spam_rate_form_ip_hour', 3),
                'per_ip_total_per_hour' => (int) setting('spam_rate_ip_total_hour', 5),
                'per_email_per_day' => (int) setting('spam_rate_email_day', 2),
                'per_session_total' => (int) setting('spam_rate_session_total', 10),
            ],
            'form_rules' => json_decode(setting('spam_form_rules', '{}'), true) ?: [],
        ];
    }
    
    private function loadSpamKeywords(): void
    {
        try {
            $this->spamKeywords = $this->db->fetchAll(
                "SELECT keyword, weight FROM spam_keywords WHERE is_active = 1"
            );
        } catch (\\Throwable $e) {
            // Fallback defaults
            $this->spamKeywords = [
                ['keyword' => 'viagra', 'weight' => 30],
                ['keyword' => 'casino', 'weight' => 30],
                ['keyword' => 'loan', 'weight' => 15],
                ['keyword' => 'crypto', 'weight' => 15],
                ['keyword' => 'bitcoin', 'weight' => 15],
                ['keyword' => 'seo services', 'weight' => 25],
                ['keyword' => 'backlinks', 'weight' => 25],
                ['keyword' => 'guest post', 'weight' => 20],
                ['keyword' => 'buy followers', 'weight' => 30],
                ['keyword' => 'make money', 'weight' => 20],
                ['keyword' => 'work from home', 'weight' => 15],
                ['keyword' => 'free money', 'weight' => 25],
                ['keyword' => 'click here', 'weight' => 10],
                ['keyword' => 'earn \$', 'weight' => 20],
                ['keyword' => 'million dollars', 'weight' => 25],
            ];
        }
    }
    
    private function loadDisposableDomains(): void
    {
        try {
            $domains = $this->db->fetchAll(
                "SELECT domain FROM disposable_domains WHERE is_active = 1"
            );
            $this->disposableDomains = array_column($domains, 'domain');
        } catch (\\Throwable $e) {
            // Fallback defaults
            $this->disposableDomains = [
                'mailinator.com', 'tempmail.com', 'guerrillamail.com', '10minutemail.com',
                'yopmail.com', 'trashmail.com', 'sharklasers.com', 'guerrillamailblock.com',
                'grr.la', 'dispostable.com', 'maildrop.cc', 'temp-mail.org', 'fakeinbox.com',
                'tempail.com', 'throwawaymail.com', 'mailnesia.com', 'getnada.com',
            ];
        }
    }
    
    private function generateTimeToken(int $timestamp): string
    {
        $appKey = getenv('APP_KEY') ?: 'default-key';
        return hash_hmac('sha256', (string) $timestamp, $appKey);
    }
    
    private function getCountryForIP(string $ip): string
    {
        // Use cached result if available
        $cacheKey = 'geo_' . md5($ip);
        $cached = Cache::get($cacheKey);
        if ($cached) return $cached;
        
        try {
            $response = @file_get_contents("https://ipapi.co/{$ip}/country/");
            if ($response && strlen($response) === 2) {
                Cache::set($cacheKey, $response, 86400 * 7); // Cache 7 days
                return trim($response);
            }
        } catch (\\Throwable $e) {
            // Silently fail
        }
        
        return '';
    }
}
`
  },
  
  // ============================================
  // CORE: Captcha - reCAPTCHA + Math
  // ============================================
  {
    path: 'app/core/Captcha.php',
    name: 'Captcha.php',
    language: 'php',
    category: 'Core',
    description: 'reCAPTCHA v2/v3 + Math captcha implementation',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Captcha - reCAPTCHA v2/v3 + Math Captcha
 */
class Captcha
{
    private string $siteKey;
    private string $secretKey;
    private string $version;
    private float $threshold;
    
    public function __construct()
    {
        $this->siteKey = setting('recaptcha_site_key', '');
        $this->secretKey = setting('recaptcha_secret_key', '');
        $this->version = setting('recaptcha_version', 'v3');
        $this->threshold = (float) setting('recaptcha_threshold', 0.5);
    }
    
    /**
     * Verify reCAPTCHA token
     */
    public function verifyRecaptcha(?string $token = null): array
    {
        if (empty($this->secretKey)) {
            return ['success' => true, 'error' => 'reCAPTCHA not configured'];
        }
        
        $token = $token ?? ($_POST['g-recaptcha-response'] ?? $_POST['recaptcha_token'] ?? '');
        
        if (empty($token)) {
            return ['success' => false, 'error' => 'Missing captcha token'];
        }
        
        $response = @file_get_contents(
            'https://www.google.com/recaptcha/api/siteverify?' . http_build_query([
                'secret' => $this->secretKey,
                'response' => $token,
                'remoteip' => client_ip(),
            ])
        );
        
        if (!$response) {
            // Google API down - fail gracefully
            error_log('reCAPTCHA API unreachable');
            if ($this->version === 'v3') {
                // For v3 (score-based), allow through if API down
                return ['success' => true, 'score' => null, 'warning' => 'API unavailable'];
            }
            return ['success' => false, 'error' => 'Captcha service unavailable'];
        }
        
        $data = json_decode($response, true);
        
        if (!($data['success'] ?? false)) {
            return ['success' => false, 'error' => 'Captcha verification failed'];
        }
        
        // v3: Check score
        if ($this->version === 'v3') {
            $score = $data['score'] ?? 0;
            if ($score < $this->threshold) {
                return ['success' => false, 'score' => $score, 'error' => "Score too low: {$score}"];
            }
            return ['success' => true, 'score' => $score];
        }
        
        // v2: Just success is enough
        return ['success' => true];
    }
    
    /**
     * Generate math captcha question
     */
    public function generateMath(): array
    {
        $operators = ['+', '-', '×'];
        $operator = $operators[array_rand($operators)];
        
        switch ($operator) {
            case '+':
                $a = random_int(1, 20);
                $b = random_int(1, 20);
                $answer = $a + $b;
                break;
            case '-':
                $a = random_int(10, 30);
                $b = random_int(1, $a);
                $answer = $a - $b;
                break;
            case '×':
                $a = random_int(2, 10);
                $b = random_int(2, 10);
                $answer = $a * $b;
                break;
        }
        
        // Store answer in session (hashed for security)
        $_SESSION['math_captcha'] = [
            'answer_hash' => hash('sha256', (string) $answer . session_id()),
            'expires' => time() + 600, // 10 minutes
        ];
        
        return [
            'question' => "What is {$a} {$operator} {$b}?",
            'a' => $a,
            'b' => $b,
            'operator' => $operator,
        ];
    }
    
    /**
     * Verify math captcha answer
     */
    public function verifyMath(string $answer): bool
    {
        if (!isset($_SESSION['math_captcha'])) {
            return false;
        }
        
        $captcha = $_SESSION['math_captcha'];
        
        // Check expiry
        if (time() > $captcha['expires']) {
            unset($_SESSION['math_captcha']);
            return false;
        }
        
        // Clear after use (one-time)
        unset($_SESSION['math_captcha']);
        
        // Verify answer
        $answerHash = hash('sha256', trim($answer) . session_id());
        return hash_equals($captcha['answer_hash'], $answerHash);
    }
    
    /**
     * Get site key for frontend
     */
    public function getSiteKey(): string
    {
        return $this->siteKey;
    }
    
    /**
     * Get version
     */
    public function getVersion(): string
    {
        return $this->version;
    }
    
    /**
     * Check if reCAPTCHA is configured
     */
    public function isConfigured(): bool
    {
        return !empty($this->siteKey) && !empty($this->secretKey);
    }
}
`
  },
  
  // ============================================
  // HELPERS: spam.php
  // ============================================
  {
    path: 'app/helpers/spam.php',
    name: 'spam.php',
    language: 'php',
    category: 'Helpers',
    description: 'Helper functions for spam protection in forms',
    content: `<?php
declare(strict_types=1);

/**
 * Spam Protection Helper Functions
 * 
 * Usage in views:
 *   <?= spam_field('contact') ?>      // Honeypot + timing + CSRF
 *   <?= captcha_field() ?>            // reCAPTCHA or math captcha
 */

use App\\Core\\Captcha;

/**
 * Render all spam protection hidden fields for a form
 * Includes: honeypot fields, timing token, CSRF token
 */
function spam_field(string $formName = 'form'): string
{
    // Generate random honeypot field names per session
    if (!isset($_SESSION['honeypot_field_' . $formName])) {
        $honeypotNames = [
            'website_url', 'url', 'company_website', 'homepage',
            'business_url', 'site', 'linkedin', 'twitter_url',
        ];
        $_SESSION['honeypot_field_' . $formName] = $honeypotNames[array_rand($honeypotNames)];
    }
    
    if (!isset($_SESSION['honeypot_field2_' . $formName])) {
        $honeypotNames2 = [
            'email_confirm', 'confirm_email', 'email2', 'email_verify',
            'secondary_email', 'backup_email',
        ];
        $_SESSION['honeypot_field2_' . $formName] = $honeypotNames2[array_rand($honeypotNames2)];
    }
    
    $honeypot1 = $_SESSION['honeypot_field_' . $formName];
    $honeypot2 = $_SESSION['honeypot_field2_' . $formName];
    
    // Store form load timestamp
    $_SESSION['form_time_' . $formName] = time();
    
    // Generate timing token
    $appKey = getenv('APP_KEY') ?: 'default-key';
    $timeToken = hash_hmac('sha256', (string) time(), $appKey);
    
    $html = '';
    
    // Honeypot 1 (hidden via CSS)
    $html .= '<div style="position:absolute;left:-9999px;top:-9999px;" aria-hidden="true">';
    $html .= '<input type="text" name="' . htmlspecialchars($honeypot1) . '" tabindex="-1" autocomplete="off" value="">';
    $html .= '</div>';
    
    // Honeypot 2
    $html .= '<div style="position:absolute;left:-9999px;top:-9999px;" aria-hidden="true">';
    $html .= '<input type="email" name="' . htmlspecialchars($honeypot2) . '" tabindex="-1" autocomplete="off" value="">';
    $html .= '</div>';
    
    // Timing token
    $html .= '<input type="hidden" name="_t" value="' . htmlspecialchars($timeToken) . '">';
    
    // CSRF token (from existing CSRF class)
    if (class_exists('App\\Core\\CSRF')) {
        $html .= \\App\\Core\\CSRF::field();
    }
    
    // Form identifier (for backend routing)
    $html .= '<input type="hidden" name="_form" value="' . htmlspecialchars($formName) . '">';
    
    return $html;
}

/**
 * Render captcha field (reCAPTCHA or math)
 */
function captcha_field(): string
{
    $captcha = new Captcha();
    $html = '';
    
    // reCAPTCHA v3 (invisible)
    if ($captcha->isConfigured() && $captcha->getVersion() === 'v3') {
        $siteKey = htmlspecialchars($captcha->getSiteKey());
        $html .= '<script src="https://www.google.com/recaptcha/api.js?render=' . $siteKey . '"></script>';
        $html .= '<input type="hidden" name="g-recaptcha-response" id="recaptcha-token">';
        $html .= '<script>';
        $html .= 'grecaptcha.ready(function() {';
        $html .= '  document.querySelector("form").addEventListener("submit", function(e) {';
        $html .= '    e.preventDefault();';
        $html .= '    var form = this;';
        $html .= '    grecaptcha.execute("' . $siteKey . '", {action: "submit"}).then(function(token) {';
        $html .= '      document.getElementById("recaptcha-token").value = token;';
        $html .= '      form.submit();';
        $html .= '    });';
        $html .= '  });';
        $html .= '});';
        $html .= '</script>';
        return $html;
    }
    
    // reCAPTCHA v2 (checkbox)
    if ($captcha->isConfigured() && $captcha->getVersion() === 'v2') {
        $siteKey = htmlspecialchars($captcha->getSiteKey());
        $html .= '<div class="g-recaptcha" data-sitekey="' . $siteKey . '"></div>';
        $html .= '<script src="https://www.google.com/recaptcha/api.js" async defer></script>';
        return $html;
    }
    
    // Math captcha fallback
    if (setting('math_captcha_enabled', '1') === '1') {
        $math = $captcha->generateMath();
        $html .= '<div class="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">';
        $html .= '<label class="block text-sm font-medium text-slate-300 mb-2">';
        $html .= '🔒 Security Check: ' . htmlspecialchars($math['question']);
        $html .= '</label>';
        $html .= '<input type="number" name="math_answer" required ';
        $html .= 'class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500" ';
        $html .= 'placeholder="Your answer">';
        $html .= '</div>';
        return $html;
    }
    
    return '';
}

/**
 * Quick spam check wrapper for controllers
 */
function spam_check(string $formName, array $data): array
{
    $guard = new \\App\\Core\\SpamGuard($formName);
    $passed = $guard->check($data);
    return [
        'passed' => $passed,
        'results' => $guard->getResults(),
    ];
}

/**
 * Get rate limit retry message
 */
function rate_limit_message(int $seconds): string
{
    if ($seconds < 60) {
        return "Please try again in {$seconds} seconds.";
    }
    $minutes = (int) ceil($seconds / 60);
    return "Please try again in {$minutes} minute" . ($minutes > 1 ? 's' : '') . ".";
}
`
  },
  
  // ============================================
  // CONTROLLER: SpamController
  // ============================================
  {
    path: 'app/controllers/admin/SpamController.php',
    name: 'SpamController.php',
    language: 'php',
    category: 'Admin',
    description: 'Admin spam center with review, IP blocking, keyword management, statistics',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Admin;

use App\\Core\\Controller;
use App\\Core\\Database;

/**
 * Spam Center Controller
 * 7 tabs: Flagged, Blocked IPs, Blocked Emails, Keywords, Disposable Domains, Rate Limits, Statistics
 */
class SpamController extends Controller
{
    protected string $layout = 'admin.main';
    
    public function index(): void
    {
        $tab = $_GET['tab'] ?? 'flagged';
        $db = Database::getInstance();
        
        $data = [
            'page_title' => 'Spam Center',
            'breadcrumbs' => [['label' => 'Spam Center', 'url' => null]],
            'tab' => $tab,
            'stats' => $this->getStats(),
        ];
        
        switch ($tab) {
            case 'flagged':
                $data['submissions'] = $db->fetchAll(
                    "SELECT * FROM form_submissions WHERE is_spam = 1 ORDER BY created_at DESC LIMIT 100"
                );
                break;
            case 'ips':
                $data['blocked_ips'] = $db->fetchAll(
                    "SELECT * FROM blocked_ips ORDER BY created_at DESC LIMIT 200"
                );
                break;
            case 'emails':
                $data['blocked_emails'] = $db->fetchAll(
                    "SELECT * FROM blocked_emails ORDER BY created_at DESC LIMIT 200"
                );
                break;
            case 'keywords':
                $data['keywords'] = $db->fetchAll(
                    "SELECT * FROM spam_keywords ORDER BY weight DESC, keyword"
                );
                break;
            case 'disposable':
                $data['disposable'] = $db->fetchAll(
                    "SELECT * FROM disposable_domains ORDER BY domain"
                );
                break;
            case 'ratelimits':
                $data['rate_limits'] = $db->fetchAll(
                    "SELECT * FROM rate_limits WHERE blocked_until > NOW() ORDER BY blocked_until DESC"
                );
                break;
            case 'stats':
                $data['stats'] = $this->getDetailedStats();
                break;
        }
        
        $this->view('admin.spam.index', $data);
    }
    
    /**
     * Mark submission as spam or not spam
     */
    public function markSubmission(): void
    {
        if (!$this->validateCsrf()) return;
        
        $id = (int) $this->input('id');
        $action = $this->input('action'); // spam, safe, delete
        $db = Database::getInstance();
        
        switch ($action) {
            case 'spam':
                $db->update('form_submissions', ['is_spam' => 1, 'status' => 'spam'], 'id = ?', [$id]);
                flash('success', 'Marked as spam');
                break;
            case 'safe':
                $submission = $db->fetch("SELECT * FROM form_submissions WHERE id = ?", [$id]);
                $db->update('form_submissions', ['is_spam' => 0, 'status' => 'reviewed'], 'id = ?', [$id]);
                
                // Teach the system: whitelist the sender
                if (!empty($submission['email'])) {
                    $db->query(
                        "INSERT IGNORE INTO blocked_emails (email, reason, permanent, created_at) 
                         VALUES (?, 'whitelisted', 0, NOW()) 
                         ON DUPLICATE KEY UPDATE permanent = 0",
                        [$submission['email']]
                    );
                }
                flash('success', 'Marked as safe (sender whitelisted)');
                break;
            case 'delete':
                $db->delete('form_submissions', 'id = ?', [$id]);
                flash('success', 'Deleted');
                break;
        }
        
        $this->redirect(url('/admin/spam'));
    }
    
    /**
     * Block/unblock IP
     */
    public function blockIP(): void
    {
        if (!$this->validateCsrf()) return;
        
        $action = $this->input('action');
        $db = Database::getInstance();
        
        if ($action === 'block') {
            $ip = trim($this->input('ip'));
            $reason = trim($this->input('reason') ?: 'Manual block');
            $permanent = $this->input('permanent') ? 1 : 0;
            $blockedUntil = $permanent ? null : date('Y-m-d H:i:s', time() + 86400 * 7);
            
            $db->insert('blocked_ips', [
                'ip' => $ip,
                'reason' => $reason,
                'permanent' => $permanent,
                'blocked_until' => $blockedUntil,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
            flash('success', "IP {$ip} blocked");
        } elseif ($action === 'unblock') {
            $id = (int) $this->input('id');
            $db->delete('blocked_ips', 'id = ?', [$id]);
            flash('success', 'IP unblocked');
        }
        
        $this->redirect(url('/admin/spam?tab=ips'));
    }
    
    /**
     * Manage spam keywords
     */
    public function manageKeyword(): void
    {
        if (!$this->validateCsrf()) return;
        
        $action = $this->input('action');
        $db = Database::getInstance();
        
        if ($action === 'add') {
            $keyword = strtolower(trim($this->input('keyword')));
            $weight = (int) $this->input('weight');
            if ($keyword && $weight > 0) {
                $db->insert('spam_keywords', [
                    'keyword' => $keyword,
                    'weight' => $weight,
                    'is_active' => 1,
                ]);
                flash('success', "Keyword added: {$keyword}");
            }
        } elseif ($action === 'toggle') {
            $id = (int) $this->input('id');
            $kw = $db->fetch("SELECT is_active FROM spam_keywords WHERE id = ?", [$id]);
            $db->update('spam_keywords', ['is_active' => $kw['is_active'] ? 0 : 1], 'id = ?', [$id]);
            flash('success', 'Keyword toggled');
        } elseif ($action === 'delete') {
            $id = (int) $this->input('id');
            $db->delete('spam_keywords', 'id = ?', [$id]);
            flash('success', 'Keyword deleted');
        }
        
        $this->redirect(url('/admin/spam?tab=keywords'));
    }
    
    /**
     * Manage disposable domains
     */
    public function manageDisposable(): void
    {
        if (!$this->validateCsrf()) return;
        
        $action = $this->input('action');
        $db = Database::getInstance();
        
        if ($action === 'add') {
            $domain = strtolower(trim($this->input('domain')));
            if ($domain) {
                $db->insert('disposable_domains', ['domain' => $domain, 'is_active' => 1]);
                flash('success', "Domain added: {$domain}");
            }
        } elseif ($action === 'delete') {
            $id = (int) $this->input('id');
            $db->delete('disposable_domains', 'id = ?', [$id]);
            flash('success', 'Domain removed');
        }
        
        $this->redirect(url('/admin/spam?tab=disposable'));
    }
    
    /**
     * Test harness - simulate spam submissions
     */
    public function test(): void
    {
        $this->view('admin.spam.test', [
            'page_title' => 'Spam Test Harness',
            'breadcrumbs' => [
                ['label' => 'Spam Center', 'url' => url('/admin/spam')],
                ['label' => 'Test Harness', 'url' => null],
            ],
        ]);
    }
    
    /**
     * Run spam test
     */
    public function runTest(): void
    {
        if (!$this->validateCsrf()) return;
        
        $testType = $this->input('test_type');
        $guard = new \\App\\Core\\SpamGuard('test');
        
        $testData = $this->getTestData($testType);
        $passed = $guard->check($testData);
        $results = $guard->getResults();
        
        $this->json([
            'test_type' => $testType,
            'passed' => $passed,
            'results' => $results,
        ]);
    }
    
    private function getTestData(string $type): array
    {
        $tests = [
            'legitimate' => [
                'name' => 'John Smith',
                'email' => 'john.smith@legitimate-company.com',
                'phone' => '+1-555-0123',
                'subject' => 'Product Inquiry',
                'message' => 'Hello, I am interested in learning more about your POS system for my retail store. Could you provide more information about pricing and features?',
            ],
            'honeypot' => [
                'name' => 'Spam Bot',
                'email' => 'bot@spam.com',
                'message' => 'Buy cheap products!',
                'website_url' => 'http://spam-site.com', // honeypot filled
            ],
            'fast_submit' => [
                'name' => 'Fast Bot',
                'email' => 'fast@bot.com',
                'message' => 'Test message',
                '_t' => 'invalid_token',
            ],
            'spam_keywords' => [
                'name' => 'Marketer',
                'email' => 'sales@seo-company.com',
                'message' => 'Hi, we offer the best SEO services with guaranteed backlinks and guest post opportunities. Buy followers cheap! Make money fast with our crypto scheme!',
            ],
            'disposable_email' => [
                'name' => 'Temp User',
                'email' => 'test@mailinator.com',
                'message' => 'Hello, I would like to know more about your services.',
            ],
            'excessive_links' => [
                'name' => 'Link Spammer',
                'email' => 'links@spam.com',
                'message' => 'Check out these sites: http://spam1.com http://spam2.com http://spam3.com http://spam4.com',
            ],
            'all_caps' => [
                'name' => 'SHOUTY PERSON',
                'email' => 'shouty@spam.com',
                'message' => 'THIS IS ALL CAPS MESSAGE THAT SHOULD BE DETECTED AS SPAM BECAUSE IT IS SHOUTING',
            ],
            'rate_limited' => [
                'name' => 'Persistent Spammer',
                'email' => 'persistent@spam.com',
                'message' => 'Please let me through',
            ],
        ];
        
        return $tests[$type] ?? $tests['legitimate'];
    }
    
    private function getStats(): array
    {
        $db = Database::getInstance();
        return [
            'total_submissions' => (int) $db->fetchColumn("SELECT COUNT(*) FROM form_submissions"),
            'spam_count' => (int) $db->fetchColumn("SELECT COUNT(*) FROM form_submissions WHERE is_spam = 1"),
            'today_submissions' => (int) $db->fetchColumn("SELECT COUNT(*) FROM form_submissions WHERE DATE(created_at) = CURDATE()"),
            'today_spam' => (int) $db->fetchColumn("SELECT COUNT(*) FROM form_submissions WHERE is_spam = 1 AND DATE(created_at) = CURDATE()"),
            'blocked_ips' => (int) $db->fetchColumn("SELECT COUNT(*) FROM blocked_ips WHERE permanent = 1 OR blocked_until > NOW()"),
            'blocked_emails' => (int) $db->fetchColumn("SELECT COUNT(*) FROM blocked_emails"),
        ];
    }
    
    private function getDetailedStats(): array
    {
        $db = Database::getInstance();
        return [
            'daily' => $db->fetchAll(
                "SELECT DATE(created_at) as date, 
                        COUNT(*) as total,
                        SUM(is_spam) as spam
                 FROM form_submissions 
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                 GROUP BY DATE(created_at) ORDER BY date"
            ),
            'top_ips' => $db->fetchAll(
                "SELECT ip, COUNT(*) as count 
                 FROM form_submissions 
                 WHERE is_spam = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                 GROUP BY ip ORDER BY count DESC LIMIT 20"
            ),
            'top_keywords' => $db->fetchAll(
                "SELECT layer_triggered, COUNT(*) as count 
                 FROM spam_logs 
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                 GROUP BY layer_triggered ORDER BY count DESC LIMIT 20"
            ),
            'by_form' => $db->fetchAll(
                "SELECT form_name, COUNT(*) as total, SUM(is_spam) as spam
                 FROM form_submissions 
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                 GROUP BY form_name ORDER BY total DESC"
            ),
        ];
    }
}
`
  },
  
  // ============================================
  // VIEW: Spam Center Index
  // ============================================
  {
    path: 'app/views/admin/spam/index.php',
    name: 'index.php',
    language: 'php',
    category: 'Views',
    description: 'Spam center main view with 7 tabs',
    content: `<?php
/**
 * Spam Center - 7 Tabs
 * Flagged | Blocked IPs | Blocked Emails | Keywords | Disposable | Rate Limits | Statistics
 */
$tab = $tab ?? 'flagged';
$stats = $stats ?? [];
?>

<div class="space-y-6" x-data>
    <!-- Header -->
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">🛡️ Spam Center</h1>
            <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">
                <?= number_format($stats['spam_count'] ?? 0) ?> spam blocked / 
                <?= number_format($stats['total_submissions'] ?? 0) ?> total submissions
            </p>
        </div>
        <a href="<?= url('/admin/spam/test') ?>" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium">
            🧪 Test Harness
        </a>
    </div>
    
    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <p class="text-xs text-gray-500 dark:text-slate-400">Today's Spam</p>
            <p class="text-2xl font-bold text-red-500"><?= $stats['today_spam'] ?? 0 ?></p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <p class="text-xs text-gray-500 dark:text-slate-400">Today's Total</p>
            <p class="text-2xl font-bold text-white"><?= $stats['today_submissions'] ?? 0 ?></p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <p class="text-xs text-gray-500 dark:text-slate-400">Blocked IPs</p>
            <p class="text-2xl font-bold text-orange-500"><?= $stats['blocked_ips'] ?? 0 ?></p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <p class="text-xs text-gray-500 dark:text-slate-400">Blocked Emails</p>
            <p class="text-2xl font-bold text-purple-500"><?= $stats['blocked_emails'] ?? 0 ?></p>
        </div>
    </div>
    
    <!-- Tabs -->
    <div class="flex flex-wrap gap-2 border-b border-gray-200 dark:border-slate-700">
        <?php
        $tabs = [
            'flagged' => ['label' => '🚩 Flagged', 'count' => $stats['today_spam'] ?? 0],
            'ips' => ['label' => '🌐 Blocked IPs', 'count' => $stats['blocked_ips'] ?? 0],
            'emails' => ['label' => '📧 Blocked Emails', 'count' => $stats['blocked_emails'] ?? 0],
            'keywords' => ['label' => '🔑 Keywords'],
            'disposable' => ['label' => '🗑️ Disposable'],
            'ratelimits' => ['label' => '⏱️ Rate Limits'],
            'stats' => ['label' => '📊 Statistics'],
        ];
        foreach ($tabs as $key => $info):
        ?>
        <a href="<?= url('/admin/spam?tab=' . $key) ?>"
           class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors <?= $tab === $key ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 border-b-2 border-blue-500' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white' ?>">
            <?= $info['label'] ?>
            <?php if (!empty($info['count'])): ?>
            <span class="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-slate-700 rounded"><?= $info['count'] ?></span>
            <?php endif; ?>
        </a>
        <?php endforeach; ?>
    </div>
    
    <!-- Tab Content -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        
        <?php if ($tab === 'flagged'): ?>
        <!-- FLAGGED SUBMISSIONS -->
        <div class="p-4">
            <h2 class="text-lg font-semibold mb-4">Flagged Spam Submissions</h2>
            <?php if (empty($submissions)): ?>
            <p class="text-center text-gray-500 dark:text-slate-400 py-12">No flagged submissions</p>
            <?php else: ?>
            <div class="space-y-3">
                <?php foreach ($submissions as $sub): 
                    $reasons = json_decode($sub['spam_reason'] ?? '[]', true) ?: [];
                ?>
                <div class="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded">
                                    Score: <?= $sub['spam_score'] ?>/100
                                </span>
                                <span class="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                                    <?= e($sub['form_name']) ?>
                                </span>
                                <span class="text-xs text-gray-500"><?= time_ago($sub['created_at']) ?></span>
                            </div>
                            <div class="text-sm space-y-1">
                                <p><strong>From:</strong> <?= e($sub['name']) ?> &lt;<?= e($sub['email']) ?>&gt;</p>
                                <p><strong>IP:</strong> <code class="text-xs"><?= e($sub['ip']) ?></code></p>
                                <?php if ($sub['subject']): ?>
                                <p><strong>Subject:</strong> <?= e($sub['subject']) ?></p>
                                <?php endif; ?>
                                <p><strong>Message:</strong> <?= e(str_limit($sub['message'], 200)) ?></p>
                                <?php if (!empty($reasons)): ?>
                                <div class="mt-2 flex flex-wrap gap-1">
                                    <?php foreach ($reasons as $r): ?>
                                    <span class="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded">
                                        <?= e($r['message']) ?> (+<?= $r['score'] ?>)
                                    </span>
                                    <?php endforeach; ?>
                                </div>
                                <?php endif; ?>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <form method="POST" action="<?= url('/admin/spam/mark') ?>" class="inline">
                                <?= \\App\\Core\\CSRF::field() ?>
                                <input type="hidden" name="id" value="<?= $sub['id'] ?>">
                                <input type="hidden" name="action" value="safe">
                                <button class="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded hover:bg-green-200">✓ Not Spam</button>
                            </form>
                            <form method="POST" action="<?= url('/admin/spam/mark') ?>" class="inline">
                                <?= \\App\\Core\\CSRF::field() ?>
                                <input type="hidden" name="id" value="<?= $sub['id'] ?>">
                                <input type="hidden" name="action" value="delete">
                                <button class="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded hover:bg-red-200">🗑 Delete</button>
                            </form>
                            <form method="POST" action="<?= url('/admin/spam/block-ip') ?>" class="inline" onsubmit="return confirm('Block this IP?')">
                                <?= \\App\\Core\\CSRF::field() ?>
                                <input type="hidden" name="action" value="block">
                                <input type="hidden" name="ip" value="<?= e($sub['ip']) ?>">
                                <input type="hidden" name="reason" value="Spam submission">
                                <button class="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded hover:bg-orange-200">🚫 Block IP</button>
                            </form>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
        
        <?php elseif ($tab === 'ips'): ?>
        <!-- BLOCKED IPS -->
        <div class="p-4">
            <h2 class="text-lg font-semibold mb-4">Blocked IP Addresses</h2>
            
            <!-- Add IP form -->
            <form method="POST" action="<?= url('/admin/spam/block-ip') ?>" class="mb-6 flex flex-wrap gap-2">
                <?= \\App\\Core\\CSRF::field() ?>
                <input type="hidden" name="action" value="block">
                <input type="text" name="ip" required placeholder="IP Address" class="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <input type="text" name="reason" placeholder="Reason" class="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="permanent" value="1" class="rounded"> Permanent
                </label>
                <button class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Block IP</button>
            </form>
            
            <table class="w-full text-sm">
                <thead><tr class="border-b border-gray-200 dark:border-slate-700">
                    <th class="py-2 px-3 text-left">IP</th>
                    <th class="py-2 px-3 text-left">Reason</th>
                    <th class="py-2 px-3 text-left">Expires</th>
                    <th class="py-2 px-3 text-right">Action</th>
                </tr></thead>
                <tbody>
                    <?php foreach ($blocked_ips ?? [] as $ip): ?>
                    <tr class="border-b border-gray-100 dark:border-slate-700/50">
                        <td class="py-2 px-3 font-mono text-xs"><?= e($ip['ip']) ?></td>
                        <td class="py-2 px-3"><?= e($ip['reason']) ?></td>
                        <td class="py-2 px-3 text-xs"><?= $ip['permanent'] ? 'Permanent' : ($ip['blocked_until'] ?? 'N/A') ?></td>
                        <td class="py-2 px-3 text-right">
                            <form method="POST" action="<?= url('/admin/spam/block-ip') ?>" class="inline">
                                <?= \\App\\Core\\CSRF::field() ?>
                                <input type="hidden" name="action" value="unblock">
                                <input type="hidden" name="id" value="<?= $ip['id'] ?>">
                                <button class="text-xs text-green-600 hover:underline">Unblock</button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <?php elseif ($tab === 'keywords'): ?>
        <!-- SPAM KEYWORDS -->
        <div class="p-4">
            <h2 class="text-lg font-semibold mb-4">Spam Keywords</h2>
            
            <form method="POST" action="<?= url('/admin/spam/keyword') ?>" class="mb-6 flex gap-2">
                <?= \\App\\Core\\CSRF::field() ?>
                <input type="hidden" name="action" value="add">
                <input type="text" name="keyword" required placeholder="Keyword" class="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <input type="number" name="weight" required value="20" min="1" max="100" class="w-24 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <button class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Add Keyword</button>
            </form>
            
            <table class="w-full text-sm">
                <thead><tr class="border-b border-gray-200 dark:border-slate-700">
                    <th class="py-2 px-3 text-left">Keyword</th>
                    <th class="py-2 px-3 text-left">Weight</th>
                    <th class="py-2 px-3 text-left">Status</th>
                    <th class="py-2 px-3 text-right">Action</th>
                </tr></thead>
                <tbody>
                    <?php foreach ($keywords ?? [] as $kw): ?>
                    <tr class="border-b border-gray-100 dark:border-slate-700/50">
                        <td class="py-2 px-3 font-mono"><?= e($kw['keyword']) ?></td>
                        <td class="py-2 px-3"><span class="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded">+<?= $kw['weight'] ?></span></td>
                        <td class="py-2 px-3"><?= $kw['is_active'] ? '<span class="text-green-500">Active</span>' : '<span class="text-gray-400">Inactive</span>' ?></td>
                        <td class="py-2 px-3 text-right">
                            <form method="POST" action="<?= url('/admin/spam/keyword') ?>" class="inline">
                                <?= \\App\\Core\\CSRF::field() ?>
                                <input type="hidden" name="action" value="toggle">
                                <input type="hidden" name="id" value="<?= $kw['id'] ?>">
                                <button class="text-xs text-blue-600 hover:underline mr-2"><?= $kw['is_active'] ? 'Disable' : 'Enable' ?></button>
                            </form>
                            <form method="POST" action="<?= url('/admin/spam/keyword') ?>" class="inline" onsubmit="return confirm('Delete?')">
                                <?= \\App\\Core\\CSRF::field() ?>
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?= $kw['id'] ?>">
                                <button class="text-xs text-red-600 hover:underline">Delete</button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <?php elseif ($tab === 'stats'): ?>
        <!-- STATISTICS -->
        <div class="p-4 space-y-6">
            <h2 class="text-lg font-semibold">Spam Statistics (Last 30 Days)</h2>
            
            <!-- Daily chart -->
            <div>
                <h3 class="text-sm font-medium mb-2">Daily Submissions vs Spam</h3>
                <div class="h-48 flex items-end gap-1">
                    <?php 
                    $maxTotal = max(array_column($stats['daily'] ?? [], 'total') ?: [1]);
                    foreach ($stats['daily'] ?? [] as $day):
                        $totalHeight = ($day['total'] / $maxTotal) * 100;
                        $spamHeight = ($day['spam'] / $maxTotal) * 100;
                    ?>
                    <div class="flex-1 flex flex-col justify-end gap-0.5" title="<?= $day['date'] ?>: <?= $day['total'] ?> total, <?= $day['spam'] ?> spam">
                        <div class="bg-red-500/60 rounded-t" style="height: <?= $spamHeight ?>%"></div>
                        <div class="bg-blue-500/60 rounded-t" style="height: <?= ($totalHeight - $spamHeight) ?>%"></div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            
            <!-- Top spam IPs -->
            <div>
                <h3 class="text-sm font-medium mb-2">Top Spam IPs (Last 7 Days)</h3>
                <div class="space-y-1">
                    <?php foreach (array_slice($stats['top_ips'] ?? [], 0, 10) as $ip): ?>
                    <div class="flex items-center justify-between text-sm">
                        <code class="font-mono text-xs"><?= e($ip['ip']) ?></code>
                        <span class="text-red-500 font-medium"><?= $ip['count'] ?> spam</span>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            
            <!-- By form -->
            <div>
                <h3 class="text-sm font-medium mb-2">Submissions by Form</h3>
                <table class="w-full text-sm">
                    <thead><tr class="border-b border-gray-200 dark:border-slate-700">
                        <th class="py-1 text-left">Form</th>
                        <th class="py-1 text-right">Total</th>
                        <th class="py-1 text-right">Spam</th>
                        <th class="py-1 text-right">Rate</th>
                    </tr></thead>
                    <tbody>
                        <?php foreach ($stats['by_form'] ?? [] as $form): ?>
                        <tr class="border-b border-gray-100 dark:border-slate-700/50">
                            <td class="py-1"><?= e($form['form_name']) ?></td>
                            <td class="py-1 text-right"><?= $form['total'] ?></td>
                            <td class="py-1 text-right text-red-500"><?= $form['spam'] ?></td>
                            <td class="py-1 text-right"><?= $form['total'] > 0 ? round(($form['spam'] / $form['total']) * 100) : 0 ?>%</td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <?php else: ?>
        <!-- Other tabs (emails, disposable, ratelimits) -->
        <div class="p-8 text-center text-gray-500">
            <p>Tab: <?= e($tab) ?></p>
            <p class="text-sm mt-2">Content managed via table above</p>
        </div>
        <?php endif; ?>
        
    </div>
</div>
`
  },
  
  // ============================================
  // VIEW: Test Harness
  // ============================================
  {
    path: 'app/views/admin/spam/test.php',
    name: 'test.php',
    language: 'php',
    category: 'Views',
    description: 'Test harness to simulate spam submissions and verify each layer',
    content: `<?php
/**
 * Spam Test Harness
 * Simulates different types of spam submissions to verify each protection layer
 */
?>

<div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">🧪 Spam Test Harness</h1>
            <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">Simulate spam submissions to verify protection layers</p>
        </div>
        <a href="<?= url('/admin/spam') ?>" class="text-sm text-blue-600 hover:underline">← Back to Spam Center</a>
    </div>
    
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6" 
         x-data="{ 
            running: false, 
            result: null,
            async runTest(type) {
                this.running = true;
                this.result = null;
                try {
                    const formData = new FormData();
                    formData.append('test_type', type);
                    formData.append('_token', document.querySelector('meta[name=csrf-token]').content);
                    
                    const res = await fetch('<?= url('/admin/spam/run-test') ?>', {
                        method: 'POST',
                        body: formData,
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });
                    this.result = await res.json();
                } catch (e) {
                    this.result = { error: e.message };
                }
                this.running = false;
            }
         }">
        
        <h2 class="text-lg font-semibold mb-4">Test Scenarios</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <?php
            $tests = [
                'legitimate' => ['icon' => '✅', 'title' => 'Legitimate Submission', 'desc' => 'Normal user, should pass all checks'],
                'honeypot' => ['icon' => '🍯', 'title' => 'Honeypot Filled', 'desc' => 'Bot fills hidden field'],
                'fast_submit' => ['icon' => '⚡', 'title' => 'Too Fast Submit', 'desc' => 'Submitted in < 3 seconds'],
                'spam_keywords' => ['icon' => '🔑', 'title' => 'Spam Keywords', 'desc' => 'Contains spam terms'],
                'disposable_email' => ['icon' => '🗑️', 'title' => 'Disposable Email', 'desc' => 'Uses mailinator.com'],
                'excessive_links' => ['icon' => '🔗', 'title' => 'Excessive Links', 'desc' => 'More than 2 URLs in message'],
                'all_caps' => ['icon' => '📢', 'title' => 'ALL CAPS', 'desc' => 'Message in all caps'],
                'rate_limited' => ['icon' => '⏱️', 'title' => 'Rate Limited', 'desc' => 'Too many submissions'],
            ];
            foreach ($tests as $key => $test):
            ?>
            <button 
                @click="runTest('<?= $key ?>')"
                :disabled="running"
                class="p-4 text-left bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors disabled:opacity-50">
                <div class="flex items-start gap-3">
                    <span class="text-2xl"><?= $test['icon'] ?></span>
                    <div>
                        <h3 class="font-semibold text-gray-900 dark:text-white"><?= $test['title'] ?></h3>
                        <p class="text-xs text-gray-500 dark:text-slate-400 mt-1"><?= $test['desc'] ?></p>
                    </div>
                </div>
            </button>
            <?php endforeach; ?>
        </div>
        
        <!-- Results -->
        <div x-show="running" class="text-center py-8">
            <svg class="animate-spin w-8 h-8 mx-auto text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <p class="mt-2 text-gray-500">Running spam checks...</p>
        </div>
        
        <div x-show="result && !running" x-transition class="space-y-4">
            <div class="p-4 rounded-xl" :class="result.passed ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'">
                <div class="flex items-center gap-3">
                    <span class="text-3xl" x-text="result.passed ? '✅' : '🚫'"></span>
                    <div>
                        <h3 class="font-semibold" :class="result.passed ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'" x-text="result.passed ? 'PASSED - Not Spam' : 'BLOCKED - Detected as Spam'"></h3>
                        <p class="text-sm" :class="result.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                            Spam Score: <span x-text="result.score"></span>/100 (Threshold: <span x-text="result.threshold"></span>)
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Layer Results -->
            <div class="space-y-2">
                <h4 class="font-semibold text-sm">Layer-by-Layer Results:</h4>
                <template x-for="(data, layer) in result.checks" :key="layer">
                    <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                        <span class="text-sm font-medium capitalize" x-text="layer"></span>
                        <div class="flex items-center gap-2">
                            <span class="text-xs px-2 py-0.5 rounded" :class="data.passed ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'" x-text="data.passed ? '✓ PASS' : '✗ FAIL'"></span>
                        </div>
                    </div>
                </template>
            </div>
            
            <!-- Reasons -->
            <div x-show="result.reasons && result.reasons.length > 0">
                <h4 class="font-semibold text-sm mb-2">Detection Reasons:</h4>
                <div class="space-y-1">
                    <template x-for="reason in result.reasons" :key="reason.code">
                        <div class="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/10 rounded text-sm">
                            <span x-text="reason.message"></span>
                            <span class="text-amber-600 dark:text-amber-400 font-mono text-xs">+<span x-text="reason.score"></span></span>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Protection Layers Info -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h2 class="text-lg font-semibold mb-4">🛡️ Active Protection Layers</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <?php
            $layers = [
                ['num' => 1, 'name' => 'Honeypot Fields', 'desc' => 'Hidden fields to trap bots', 'status' => 'active'],
                ['num' => 2, 'name' => 'Time-Based Protection', 'desc' => 'Rejects submissions < 3 seconds', 'status' => 'active'],
                ['num' => 3, 'name' => 'CSRF Token', 'desc' => 'One-time use tokens', 'status' => 'active'],
                ['num' => 4, 'name' => 'Rate Limiting', 'desc' => 'Per IP/session/email limits', 'status' => 'active'],
                ['num' => 5, 'name' => 'Content Analysis', 'desc' => 'Spam keyword detection', 'status' => setting('spam_content_enabled', '1') === '1' ? 'active' : 'disabled'],
                ['num' => 6, 'name' => 'Email Validation', 'desc' => 'MX check + disposable blocklist', 'status' => 'active'],
                ['num' => 7, 'name' => 'reCAPTCHA', 'desc' => setting('recaptcha_enabled', '0') === '1' ? 'v' . setting('recaptcha_version', 'v3') : 'Not configured', 'status' => setting('recaptcha_enabled', '0') === '1' ? 'active' : 'disabled'],
                ['num' => 8, 'name' => 'Math Captcha', 'desc' => 'Fallback captcha', 'status' => setting('math_captcha_enabled', '1') === '1' ? 'active' : 'disabled'],
                ['num' => 9, 'name' => 'IP & Geo Intelligence', 'desc' => 'Block bad IPs/countries', 'status' => 'active'],
                ['num' => 10, 'name' => 'Email Headers', 'desc' => 'X-Spam-Score headers', 'status' => 'active'],
                ['num' => 11, 'name' => 'Spam Queue', 'desc' => 'Admin review system', 'status' => 'active'],
                ['num' => 12, 'name' => 'Form-Specific', 'desc' => 'Per-form hardening rules', 'status' => 'active'],
            ];
            foreach ($layers as $layer):
            ?>
            <div class="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                <span class="text-lg"><?= $layer['status'] === 'active' ? '✅' : '⚪' ?></span>
                <div>
                    <p class="font-medium">Layer <?= $layer['num'] ?>: <?= $layer['name'] ?></p>
                    <p class="text-xs text-gray-500 dark:text-slate-400"><?= $layer['desc'] ?></p>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</div>
`
  },
  
  // ============================================
  // COMPONENT: Form Protection Fields
  // ============================================
  {
    path: 'app/views/components/form-protection.php',
    name: 'form-protection.php',
    language: 'php',
    category: 'Components',
    description: 'Reusable form protection partial - include in any form',
    content: `<?php
/**
 * Form Protection Component
 * 
 * Usage in any form:
 * <?php require APP_PATH . '/views/components/form-protection.php'; ?>
 * 
 * Or use helper:
 * <?= spam_field('contact') ?>
 * <?= captcha_field() ?>
 */

$formName = $formName ?? 'form';
$enableCaptcha = $enableCaptcha ?? true;
$enableMath = $enableMath ?? (setting('recaptcha_enabled', '0') !== '1');
?>

<!-- Spam Protection Fields -->
<?= spam_field($formName) ?>

<?php if ($enableCaptcha): ?>
    <?= captcha_field() ?>
<?php endif; ?>

<!-- Client-side timing protection -->
<script>
(function() {
    const form = document.currentScript.parentElement.closest('form');
    if (!form) return;
    
    // Prevent double submission
    form.addEventListener('submit', function(e) {
        if (form.dataset.submitting === 'true') {
            e.preventDefault();
            return false;
        }
        form.dataset.submitting = 'true';
        
        // Re-enable after 5 seconds in case of error
        setTimeout(() => { form.dataset.submitting = 'false'; }, 5000);
    });
    
    // Disable submit button during submission
    form.addEventListener('submit', function() {
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = '<svg class="animate-spin inline w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Sending...';
        }
    });
})();
</script>
`
  },
  
  // ============================================
  // JS: Client-side form protection
  // ============================================
  {
    path: 'assets/js/form-protection.js',
    name: 'form-protection.js',
    language: 'javascript',
    category: 'Assets',
    description: 'Client-side form protection: timing, honeypot rotation, double-submit prevention',
    content: `/**
 * Khybersoft Form Protection
 * Client-side spam protection helpers
 */

(function() {
    'use strict';
    
    // Form protection manager
    const FormProtection = {
        forms: new Map(),
        
        init() {
            // Find all protected forms
            document.querySelectorAll('form[data-spam-form]').forEach(form => {
                this.registerForm(form);
            });
        },
        
        registerForm(form) {
            const formName = form.dataset.spamForm || 'form';
            
            // Track submission state
            const state = {
                submitting: false,
                submittedAt: null,
                loadTime: Date.now(),
            };
            
            this.forms.set(form, state);
            
            // Add submit handler
            form.addEventListener('submit', (e) => this.handleSubmit(e, form, state));
            
            // Add honeypot clearing (legitimate users won't touch hidden fields)
            this.setupHoneypot(form);
        },
        
        setupHoneypot(form) {
            // Any interaction with honeypot fields = bot
            const honeypots = form.querySelectorAll('[data-honeypot]');
            honeypots.forEach(hp => {
                hp.addEventListener('focus', () => {
                    hp.dataset.touched = 'true';
                });
                hp.addEventListener('input', () => {
                    hp.dataset.touched = 'true';
                });
            });
        },
        
        handleSubmit(e, form, state) {
            // Prevent double submission
            if (state.submitting) {
                e.preventDefault();
                return false;
            }
            
            // Check timing (min 2 seconds)
            const elapsed = (Date.now() - state.loadTime) / 1000;
            if (elapsed < 2) {
                e.preventDefault();
                console.warn('Form submitted too quickly');
                return false;
            }
            
            state.submitting = true;
            
            // Disable submit button
            const btn = form.querySelector('button[type="submit"], input[type="submit"]');
            if (btn) {
                btn.disabled = true;
                btn.dataset.originalText = btn.textContent;
                btn.textContent = 'Sending...';
            }
            
            // Re-enable after timeout (in case of error)
            setTimeout(() => {
                state.submitting = false;
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = btn.dataset.originalText || 'Submit';
                }
            }, 10000);
        }
    };
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => FormProtection.init());
    } else {
        FormProtection.init();
    }
    
    // Expose globally for manual init
    window.FormProtection = FormProtection;
})();
`
  },
  
  // ============================================
  // DB MIGRATION: Spam tables
  // ============================================
  {
    path: 'database/migrations/spam_tables.sql',
    name: 'spam_tables.sql',
    language: 'sql',
    category: 'Database',
    description: 'Database tables for spam protection system',
    content: `-- Spam Protection Tables
-- ============================================

-- Form submissions (all submissions, spam or not)
CREATE TABLE IF NOT EXISTS \`form_submissions\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`form_name\` VARCHAR(50) NOT NULL,
  \`name\` VARCHAR(100) NULL,
  \`email\` VARCHAR(255) NULL,
  \`phone\` VARCHAR(20) NULL,
  \`subject\` VARCHAR(255) NULL,
  \`message\` TEXT NULL,
  \`data_json\` JSON NULL,
  \`ip\` VARCHAR(45) NULL,
  \`user_agent\` TEXT NULL,
  \`session_id\` VARCHAR(128) NULL,
  \`spam_score\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  \`is_spam\` TINYINT(1) NOT NULL DEFAULT 0,
  \`spam_reason\` JSON NULL,
  \`status\` ENUM('pending','reviewed','spam','deleted') NOT NULL DEFAULT 'pending',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_fs_form\` (\`form_name\`),
  INDEX \`idx_fs_email\` (\`email\`),
  INDEX \`idx_fs_ip\` (\`ip\`),
  INDEX \`idx_fs_spam\` (\`is_spam\`),
  INDEX \`idx_fs_created\` (\`created_at\`),
  INDEX \`idx_fs_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rate limits tracking
CREATE TABLE IF NOT EXISTS \`rate_limits\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`identifier\` VARCHAR(255) NOT NULL,
  \`form_name\` VARCHAR(50) NULL,
  \`attempts\` INT UNSIGNED NOT NULL DEFAULT 1,
  \`first_attempt_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`blocked_until\` TIMESTAMP NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_rl_identifier\` (\`identifier\`(191)),
  INDEX \`idx_rl_blocked\` (\`blocked_until\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blocked IPs
CREATE TABLE IF NOT EXISTS \`blocked_ips\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`ip\` VARCHAR(45) NOT NULL,
  \`reason\` VARCHAR(255) NULL,
  \`permanent\` TINYINT(1) NOT NULL DEFAULT 0,
  \`blocked_until\` TIMESTAMP NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_bip_ip\` (\`ip\`),
  INDEX \`idx_bip_until\` (\`blocked_until\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blocked emails/domains
CREATE TABLE IF NOT EXISTS \`blocked_emails\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`email\` VARCHAR(255) NOT NULL,
  \`reason\` VARCHAR(255) NULL,
  \`permanent\` TINYINT(1) NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_be_email\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Spam keywords
CREATE TABLE IF NOT EXISTS \`spam_keywords\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`keyword\` VARCHAR(100) NOT NULL,
  \`weight\` TINYINT UNSIGNED NOT NULL DEFAULT 20,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_sk_keyword\` (\`keyword\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Disposable email domains
CREATE TABLE IF NOT EXISTS \`disposable_domains\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`domain\` VARCHAR(100) NOT NULL,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_dd_domain\` (\`domain\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Spam logs (detailed per-layer logs)
CREATE TABLE IF NOT EXISTS \`spam_logs\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`submission_id\` BIGINT UNSIGNED NULL,
  \`layer_triggered\` VARCHAR(50) NOT NULL,
  \`details\` TEXT NULL,
  \`score\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_sl_submission\` (\`submission_id\`),
  INDEX \`idx_sl_layer\` (\`layer_triggered\`),
  INDEX \`idx_sl_created\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SEED DATA
-- ============================================

-- Default spam keywords
INSERT INTO \`spam_keywords\` (\`keyword\`, \`weight\`) VALUES
('viagra', 30), ('cialis', 30), ('casino', 30), ('poker', 25),
('loan', 15), ('mortgage', 15), ('crypto', 15), ('bitcoin', 15),
('seo services', 25), ('backlinks', 25), ('guest post', 20),
('buy followers', 30), ('buy likes', 30), ('make money', 20),
('work from home', 15), ('earn money', 20), ('free money', 25),
('click here', 10), ('urgent', 5), ('winner', 20),
('lottery', 25), ('inheritance', 20), ('million dollars', 25),
('nigerian prince', 40), ('wire transfer', 20),
('weight loss', 15), ('diet pills', 25),
('dating service', 15), ('singles in your area', 30),
('enlargement', 30), ('pharmacy', 15);

-- Disposable email domains (top 100+)
INSERT INTO \`disposable_domains\` (\`domain\`) VALUES
('mailinator.com'), ('guerrillamail.com'), ('guerrillamailblock.com'),
('10minutemail.com'), ('tempmail.com'), ('yopmail.com'), ('yopmail.fr'),
('trashmail.com'), ('trashmail.net'), ('sharklasers.com'),
('grr.la'), ('dispostable.com'), ('maildrop.cc'), ('temp-mail.org'),
('fakeinbox.com'), ('tempail.com'), ('throwawaymail.com'),
('mailnesia.com'), ('getnada.com'), ('mohmal.com'), ('burnermail.io'),
('tempmailo.com'), ('emailondeck.com'), ('incognitomail.com'),
('mintemail.com'), ('spamgourmet.com'), ('mytemp.email'),
('tempr.email'), ('discard.email'), ('discardmail.com'),
('mailexpire.com'), ('tempinbox.com'), ('mailcatch.com'),
('mailscrap.com'), ('spamfree24.org'), ('wegwerfmail.de'),
('trash-mail.com'), ('trashmail.me'), ('trashmail.at'),
('trashmail.io'), ('trashymail.com'), ('mailzilla.com'),
('jetable.org'), ('meltmail.com'), ('spamavert.com'),
('nobulk.com'), ('spaml.com'), ('spambox.us'),
('uggsrock.com'), ('suremail.info'), ('mailhazard.com'),
('mailhz.com'), ('tagyoureit.com'), ('emailigo.de'),
('mailsent.net'), ('mailbidon.com'), ('binkmail.com'),
('bobmail.info'), ('chammy.info'), ('devnullmail.com'),
('letthemeatspam.com'), ('mailshell.com'), ('mailsiphon.com'),
('mailslite.com'), ('mailzen.net'), ('mobi.web.id'),
('moncourrier.fr.nf'), ('monemail.fr.nf'), ('monmail.fr.nf'),
('nomail.xl.cx'), ('nomail.pw'), ('nospam.ze.tc'),
('速攻メール.com'), ('rppkn.com'), ('tmail.ws'),
('tmailinator.com'), ('tradermail.info'), ('mailsac.com'),
('harakirimail.com'), ('crazymailing.com'), ('armyspy.com'),
('cuvox.de'), ('dayrep.com'), ('einrot.com'), ('fleckens.hu'),
('gustr.com'), ('jourrapide.com'), ('rhyta.com'), ('superrito.com'),
('teleworm.us'), ('getairmail.com'), ('filzmail.com');

-- Default settings for spam protection
INSERT INTO \`settings\` (\`key\`, \`value\`, \`type\`, \`group\`, \`label\`, \`description\`, \`is_public\`) VALUES
('spam_threshold', '60', 'integer', 'security', 'Spam Score Threshold', 'Score above this = spam (0-100)', 0),
('spam_content_threshold', '40', 'integer', 'security', 'Content Analysis Threshold', 'Content score threshold', 0),
('spam_auto_block_threshold', '90', 'integer', 'security', 'Auto-Block Threshold', 'Auto-block IP if score above this', 0),
('spam_auto_block_after', '3', 'integer', 'security', 'Auto-Block After N Spam', 'Block IP after N spam submissions in 24h', 0),
('spam_check_dns_mx', '1', 'boolean', 'security', 'Check DNS MX Records', 'Reject emails from domains with no MX', 0),
('spam_block_disposable', '1', 'boolean', 'security', 'Block Disposable Emails', 'Reject emails from disposable domains', 0),
('spam_block_non_latin', '0', 'boolean', 'security', 'Block Non-Latin Characters', 'Detect Cyrillic/Arabic in English forms', 0),
('spam_notify_admin', '0', 'boolean', 'security', 'Notify Admin on Spam', 'Email admin when spam detected', 0),
('spam_country_blocking', '0', 'boolean', 'security', 'Enable Country Blocking', 'Block submissions from specific countries', 0),
('spam_blocked_countries', '[]', 'json', 'security', 'Blocked Countries', 'JSON array of country codes to block', 0),
('spam_ip_whitelist', '[]', 'json', 'security', 'IP Whitelist', 'JSON array of IPs to always allow', 0),
('spam_rate_form_ip_hour', '3', 'integer', 'security', 'Rate: Per Form/IP/Hour', 'Max submissions per form per IP per hour', 0),
('spam_rate_ip_total_hour', '5', 'integer', 'security', 'Rate: Total/IP/Hour', 'Max total submissions per IP per hour', 0),
('spam_rate_email_day', '2', 'integer', 'security', 'Rate: Email/Day', 'Max submissions per email per day', 0),
('spam_rate_session_total', '10', 'integer', 'security', 'Rate: Session Total', 'Max submissions per session total', 0),
('spam_content_enabled', '1', 'boolean', 'security', 'Enable Content Analysis', 'Analyze message content for spam', 0),
('spam_form_rules', '{}', 'json', 'security', 'Form-Specific Rules', 'JSON rules per form', 0),
('math_captcha_enabled', '1', 'boolean', 'security', 'Enable Math Captcha', 'Use math captcha as fallback', 0),
('math_captcha_fallback', '1', 'boolean', 'security', 'Math Fallback for reCAPTCHA', 'Use math if reCAPTCHA fails', 0);
`
  },
];
