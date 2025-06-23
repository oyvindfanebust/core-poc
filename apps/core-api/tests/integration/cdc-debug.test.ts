import { createTestContext, cleanupTestContext, TestContext } from '../helpers/test-setup.js';

describe('CDC Debug', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  }, 30000);

  afterAll(async () => {
    await cleanupTestContext();
  }, 10000);

  it('should check CDC manager status', () => {
    console.log('CDC Manager status:', {
      exists: !!context.services.cdcManager,
      isConnected: context.services.cdcManager?.isConnected,
    });
    
    expect(context.services.cdcManager).toBeDefined();
    
    // For now, let's just see what the status is
    const isConnected = context.services.cdcManager.isConnected;
    console.log('CDC Connected:', isConnected);
  });
});