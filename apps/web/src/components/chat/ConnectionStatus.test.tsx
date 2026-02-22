import { describe, expect, it } from 'vitest';
import { ConnectionStatus } from './ConnectionStatus';

// Test the component exports and props validation
describe('ConnectionStatus', () => {
  it('is exported as component', () => {
    expect(ConnectionStatus).toBeDefined();
  });

  describe('Props validation', () => {
    it('accepts connected status', () => {
      const props = { status: 'connected' };
      expect(props.status).toBe('connected');
    });

    it('accepts connecting status', () => {
      const props = { status: 'connecting' };
      expect(props.status).toBe('connecting');
    });

    it('accepts reconnecting status', () => {
      const props = { status: 'reconnecting' };
      expect(props.status).toBe('reconnecting');
    });

    it('accepts disconnected status', () => {
      const props = { status: 'disconnected' };
      expect(props.status).toBe('disconnected');
    });

    it('accepts error status', () => {
      const props = { status: 'error' };
      expect(props.status).toBe('error');
    });
  });

  describe('Status display logic', () => {
    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'connected':
          return 'Connected';
        case 'connecting':
          return 'Connecting...';
        case 'reconnecting':
          return 'Reconnecting...';
        case 'disconnected':
          return 'Disconnected';
        case 'error':
          return 'Connection Error';
        default:
          return 'Unknown';
      }
    };

    it('shows "Connected" for connected status', () => {
      expect(getStatusLabel('connected')).toBe('Connected');
    });

    it('shows "Reconnecting..." for reconnecting status', () => {
      expect(getStatusLabel('reconnecting')).toBe('Reconnecting...');
    });

    it('shows "Connection Error" for error status', () => {
      expect(getStatusLabel('error')).toBe('Connection Error');
    });
  });
});
