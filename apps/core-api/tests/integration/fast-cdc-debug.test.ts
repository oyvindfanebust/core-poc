import { createTestServicesWithMocks, MockServiceContainer } from '../mocks/mock-service-factory.js';

describe('Fast CDC Debug (Mock Services)', () => {
  let services: MockServiceContainer;

  beforeAll(async () => {
    // Use mock services for fast testing
    services = await createTestServicesWithMocks();
  });

  it('should check CDC manager status', () => {
    console.log('CDC Manager status:', {
      exists: !!services.cdcManager,
      isConnected: services.cdcManager?.isConnected,
    });
    
    expect(services.cdcManager).toBeDefined();
    
    // For now, let's just see what the status is
    const isConnected = services.cdcManager.isConnected;
    console.log('CDC Connected:', isConnected);
    expect(isConnected).toBe(true); // Mock should always be "connected"
  });
});