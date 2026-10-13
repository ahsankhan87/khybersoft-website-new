# Khybersoft API Documentation

## 📡 Overview

Khybersoft provides several API endpoints for integration with external systems, license validation, and webhook notifications.

**Base URL**: `https://yourdomain.com/api`

**Authentication**: Most endpoints require authentication via API key or Bearer token.

---

## 🔑 Authentication

### API Key Authentication
Include your API key in the request header:
```
X-API-Key: your-api-key-here
```

### Bearer Token Authentication
For user-specific actions:
```
Authorization: Bearer your-access-token
```

---

## 📦 License Validation API

### Validate License Key
Validate a software license key.

**Endpoint**: `GET /api/license/validate`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| key | string | Yes | License key to validate |

**Example Request**:
```bash
curl -X GET "https://yourdomain.com/api/license/validate?key=ABCD-1234-EFGH-5678"
```

**Success Response** (200 OK):
```json
{
  "valid": true,
  "product": "POS System Pro",
  "product_slug": "pos-system-pro",
  "order_number": "KBS-20240115-A1B2C3",
  "customer_email": "customer@example.com",
  "purchased_at": "2024-01-15 10:30:00",
  "type": "lifetime"
}
```

**Invalid License Response** (200 OK):
```json
{
  "valid": false,
  "message": "Invalid license key"
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "License key required"
}
```

---

### Activate License
Activate a license for a specific domain.

**Endpoint**: `POST /api/license/activate`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| key | string | Yes | License key |
| domain | string | Yes | Domain to activate |
| ip | string | No | IP address (auto-detected) |

**Example Request**:
```bash
curl -X POST "https://yourdomain.com/api/license/activate" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "ABCD-1234-EFGH-5678",
    "domain": "client-site.com"
  }'
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "License activated successfully",
  "product": "POS System Pro"
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "message": "Key and domain required"
}
```

---

## 💳 Payment Webhooks

### Stripe Webhooks
Receive notifications for Stripe payment events.

**Endpoint**: `POST /api/webhooks/stripe`

**Authentication**: Stripe signature verification

**Supported Events**:
- `checkout.session.completed` - Payment completed
- `payment_intent.succeeded` - Payment succeeded
- `invoice.paid` - Subscription payment
- `customer.subscription.created` - Subscription created
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription cancelled

**Example Payload** (checkout.session.completed):
```json
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_123",
      "payment_intent": "pi_123",
      "customer_email": "customer@example.com",
      "metadata": {
        "order_id": "123",
        "product_id": "456"
      }
    }
  }
}
```

**Response** (200 OK):
```json
{
  "status": "received"
}
```

**Setup**:
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events to listen to
4. Copy webhook secret to Settings → Payment → Stripe Webhook Secret

---

### PayPal Webhooks
Receive notifications for PayPal payment events.

**Endpoint**: `POST /api/webhooks/paypal`

**Authentication**: PayPal signature verification

**Supported Events**:
- `PAYMENT.CAPTURE.COMPLETED` - Payment completed
- `PAYMENT.CAPTURE.DENIED` - Payment denied
- `PAYMENT.CAPTURE.REFUNDED` - Payment refunded
- `BILLING.SUBSCRIPTION.ACTIVATED` - Subscription activated
- `BILLING.SUBSCRIPTION.CANCELLED` - Subscription cancelled

**Example Payload**:
```json
{
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "resource": {
    "id": "PAYMENT_ID",
    "status": "COMPLETED",
    "amount": {
      "value": "49.99",
      "currency_code": "USD"
    },
    "custom_id": "ORDER_123"
  }
}
```

**Response** (200 OK):
```json
{
  "status": "received"
}
```

---

## 📊 Analytics API

### Track Page View
Track a page view for analytics.

**Endpoint**: `POST /api/analytics/track`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| url | string | Yes | Page URL |
| title | string | No | Page title |
| content_type | string | No | Content type (product, blog, etc.) |
| content_id | integer | No | Content ID |

**Example Request**:
```bash
curl -X POST "https://yourdomain.com/api/analytics/track" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "/products/pos-system-pro",
    "title": "POS System Pro",
    "content_type": "product",
    "content_id": 1
  }'
```

**Response** (200 OK):
```json
{
  "success": true
}
```

---

### Get Popular Content
Get most viewed content.

**Endpoint**: `GET /api/analytics/popular`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | No | Content type (product, blog, tutorial) |
| limit | integer | No | Number of items (default: 10) |
| days | integer | No | Time period in days (default: 30) |

**Example Request**:
```bash
curl -X GET "https://yourdomain.com/api/analytics/popular?type=product&limit=5&days=7"
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "name": "POS System Pro",
      "slug": "pos-system-pro",
      "views": 1234,
      "url": "/products/pos-system-pro"
    }
  ]
}
```

---

## 🔍 Search API

### Live Search
Get live search results for autocomplete.

**Endpoint**: `GET /api/search/live`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query (min 2 chars) |

**Example Request**:
```bash
curl -X GET "https://yourdomain.com/api/search/live?q=pos"
```

**Response** (200 OK):
```json
{
  "query": "pos",
  "total": 5,
  "groups": {
    "product": [
      {
        "id": 1,
        "title": "POS System Pro",
        "description": "Complete point of sale solution...",
        "url": "/products/pos-system-pro",
        "type": "product",
        "image": "/uploads/products/pos-hero.jpg"
      }
    ],
    "blog": [
      {
        "id": 3,
        "title": "5 Ways POS Systems Boost Sales",
        "description": "Learn how modern POS systems...",
        "url": "/blog/5-ways-pos-systems-boost-sales",
        "type": "blog",
        "image": "/uploads/blog/pos-article.jpg"
      }
    ]
  },
  "all_url": "/search?q=pos"
}
```

---

## 📧 Newsletter API

### Subscribe
Subscribe to newsletter.

**Endpoint**: `POST /api/newsletter/subscribe`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | Yes | Email address |

**Example Request**:
```bash
curl -X POST "https://yourdomain.com/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "subscriber@example.com"
  }'
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Successfully subscribed"
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "message": "Email already subscribed"
}
```

---

### Unsubscribe
Unsubscribe from newsletter.

**Endpoint**: `GET /api/newsletter/unsubscribe`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| token | string | Yes | Unsubscribe token |

**Example Request**:
```bash
curl -X GET "https://yourdomain.com/api/newsletter/unsubscribe?token=abc123..."
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Successfully unsubscribed"
}
```

---

## 📥 Download API

### Get Download Link
Get a secure download link for a product.

**Endpoint**: `POST /api/download/generate`

**Authentication**: Required (user must have purchased product)

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| product_id | integer | Yes | Product ID |
| order_id | integer | No | Order ID (for paid products) |

**Example Request**:
```bash
curl -X POST "https://yourdomain.com/api/download/generate" \
  -H "Authorization: Bearer user-token" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "order_id": 123
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "download_url": "/download/abc123def456...",
  "expires_at": "2024-01-16 10:30:00"
}
```

---

### Validate Download Token
Validate a download token and serve file.

**Endpoint**: `GET /api/download/{token}`

**Example Request**:
```bash
curl -X GET "https://yourdomain.com/api/download/abc123def456..."
```

**Response**: File download (binary)

**Error Response** (404 Not Found):
```json
{
  "error": "Download link expired or invalid"
}
```

---

## 📝 Contact Form API

### Submit Contact Form
Submit a contact form.

**Endpoint**: `POST /api/contact`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Contact name |
| email | string | Yes | Contact email |
| phone | string | No | Contact phone |
| subject | string | Yes | Message subject |
| message | string | Yes | Message content |

**Example Request**:
```bash
curl -X POST "https://yourdomain.com/api/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "subject": "Product Inquiry",
    "message": "I am interested in your POS system..."
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Message sent successfully"
}
```

---

## 🎯 Product Inquiry API

### Submit Product Inquiry
Submit an inquiry about a product.

**Endpoint**: `POST /api/products/{slug}/inquire`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Contact name |
| email | string | Yes | Contact email |
| phone | string | No | Contact phone |
| company | string | No | Company name |
| message | string | Yes | Inquiry message |
| type | string | Yes | Inquiry type (demo, quote, support) |

**Example Request**:
```bash
curl -X POST "https://yourdomain.com/api/products/pos-system-pro/inquire" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "company": "Acme Corp",
    "message": "I would like a demo of your POS system",
    "type": "demo"
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Inquiry submitted successfully"
}
```

---

## 🔔 Webhook Management

### Register Webhook
Register a webhook endpoint.

**Endpoint**: `POST /api/webhooks/register`

**Authentication**: Required (admin only)

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| url | string | Yes | Webhook URL |
| events | array | Yes | Events to subscribe to |
| secret | string | Yes | Webhook secret for verification |

**Example Request**:
```bash
curl -X POST "https://yourdomain.com/api/webhooks/register" \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://client-site.com/webhooks/khybersoft",
    "events": ["order.completed", "license.activated"],
    "secret": "webhook-secret-key"
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "webhook_id": 123,
  "message": "Webhook registered successfully"
}
```

---

### List Webhooks
List all registered webhooks.

**Endpoint**: `GET /api/webhooks`

**Authentication**: Required (admin only)

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 123,
      "url": "https://client-site.com/webhooks/khybersoft",
      "events": ["order.completed", "license.activated"],
      "created_at": "2024-01-15 10:30:00",
      "status": "active"
    }
  ]
}
```

---

### Delete Webhook
Delete a webhook.

**Endpoint**: `DELETE /api/webhooks/{id}`

**Authentication**: Required (admin only)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Webhook deleted successfully"
}
```

---

## 📊 Analytics Dashboard API

### Get Dashboard Stats
Get analytics dashboard statistics.

**Endpoint**: `GET /api/analytics/dashboard`

**Authentication**: Required (admin only)

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| days | integer | No | Time period in days (default: 30) |

**Example Request**:
```bash
curl -X GET "https://yourdomain.com/api/analytics/dashboard?days=7" \
  -H "Authorization: Bearer admin-token"
```

**Response** (200 OK):
```json
{
  "total_views": 12345,
  "unique_visitors": 5678,
  "daily_views": [
    {
      "date": "2024-01-15",
      "views": 456
    }
  ],
  "popular_products": [
    {
      "name": "POS System Pro",
      "slug": "pos-system-pro",
      "views": 1234
    }
  ],
  "popular_posts": [
    {
      "title": "5 Ways POS Systems Boost Sales",
      "slug": "5-ways-pos-systems-boost-sales",
      "views": 567
    }
  ],
  "traffic_sources": [
    {
      "source": "Google",
      "visits": 2345
    }
  ],
  "conversion_funnel": {
    "visits": 5678,
    "product_views": 1234,
    "inquiries": 234,
    "demos_booked": 56
  }
}
```

---

## 🌐 Multi-Language API

### Get Available Languages
Get list of available languages.

**Endpoint**: `GET /api/languages`

**Response** (200 OK):
```json
{
  "data": [
    {
      "code": "en",
      "name": "English",
      "native_name": "English",
      "direction": "ltr",
      "is_default": true
    },
    {
      "code": "ur",
      "name": "Urdu",
      "native_name": "اردو",
      "direction": "rtl",
      "is_default": false
    }
  ]
}
```

---

### Get Translations
Get translations for a language.

**Endpoint**: `GET /api/translations/{language_code}`

**Example Request**:
```bash
curl -X GET "https://yourdomain.com/api/translations/ur"
```

**Response** (200 OK):
```json
{
  "language": "ur",
  "translations": {
    "home": "ہوم",
    "products": "مصنوعات",
    "contact": "رابطہ کریں"
  }
}
```

---

## 🔒 Rate Limiting

All API endpoints are rate limited:
- **Public endpoints**: 60 requests per minute
- **Authenticated endpoints**: 120 requests per minute
- **Webhook endpoints**: 1000 requests per minute

**Rate Limit Headers**:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1642249200
```

**Rate Limit Exceeded Response** (429 Too Many Requests):
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

---

## ❌ Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Invalid input data
- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVER_ERROR` - Internal server error

---

## 📚 API Best Practices

### Request Format
- Use HTTPS for all requests
- Set `Content-Type: application/json` for POST/PUT requests
- Include proper authentication headers
- Validate responses

### Response Handling
- Check HTTP status codes
- Parse JSON responses
- Handle error responses gracefully
- Implement retry logic for failed requests

### Security
- Never expose API keys in client-side code
- Use environment variables for secrets
- Validate and sanitize all inputs
- Implement proper error handling
- Use HTTPS exclusively

### Performance
- Cache responses when appropriate
- Use pagination for large datasets
- Implement request batching
- Monitor rate limits

---

## 🔧 API Testing

### Using cURL
```bash
# Test license validation
curl -X GET "https://yourdomain.com/api/license/validate?key=ABCD-1234"

# Test with authentication
curl -X GET "https://yourdomain.com/api/analytics/dashboard" \
  -H "Authorization: Bearer your-token"
```

### Using Postman
1. Import API collection (if available)
2. Set environment variables (base_url, api_key)
3. Test endpoints
4. Save responses

### Using JavaScript
```javascript
// Fetch API
const response = await fetch('https://yourdomain.com/api/license/validate?key=ABCD-1234');
const data = await response.json();
console.log(data);

// Axios
const { data } = await axios.get('https://yourdomain.com/api/license/validate', {
  params: { key: 'ABCD-1234' }
});
console.log(data);
```

---

## 📞 API Support

### Getting Help
1. Check this documentation
2. Review error messages
3. Test with cURL/Postman
4. Contact support: api@khybersoft.com

### Reporting Issues
When reporting API issues, include:
- Endpoint URL
- Request method
- Request headers
- Request body
- Response status code
- Response body
- Timestamp

---

## 🔄 API Versioning

The API uses URL-based versioning:
- Current version: `v1` (implicit)
- Future versions: `/api/v2/...`

**Backwards Compatibility**:
- Minor versions (v1.1, v1.2) are backwards compatible
- Major versions (v2, v3) may include breaking changes
- Deprecated endpoints are marked and removed after 6 months

---

**API Version**: 1.0.0  
**Last Updated**: January 2024

For questions or issues, contact: api@khybersoft.com
