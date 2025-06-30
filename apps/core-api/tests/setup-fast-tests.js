/**
 * Setup file for fast integration tests
 *
 * Sets environment variables to ensure fast tests cannot accidentally
 * connect to external services like TigerBeetle, PostgreSQL, or RabbitMQ.
 *
 * Fast tests should use mocks only and fail if they try to make external calls.
 */

// Set NODE_ENV to test-fast to distinguish from regular test environment
process.env.NODE_ENV = 'test-fast';

// Override service connection settings to non-existent endpoints
// This ensures that any accidental real service calls will fail immediately
process.env.TB_ADDRESS = '127.0.0.1:9999'; // Non-existent TigerBeetle port
process.env.TB_CLUSTER_ID = '999';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '9999'; // Non-existent PostgreSQL port
process.env.DATABASE_NAME = 'fast_test_should_not_connect';
process.env.RABBITMQ_URL = 'amqp://localhost:9999'; // Non-existent RabbitMQ port

// Disable external API calls
process.env.DISABLE_EXTERNAL_APIS = 'true';

// Set fast test flag
process.env.FAST_TEST_MODE = 'true';

console.log('🚀 Fast test environment configured - external services disabled');
