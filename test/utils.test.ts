import { describe, it, expect } from 'vitest';
import {
  extractEndpointName
} from '../src/utils';

describe('extractEndpointName', () => {
  describe('use prefix hooks', () => {
    it('should extract endpoint name from useGetUsersQuery', () => {
      expect(extractEndpointName('useGetUsersQuery')).toBe('getUsers');
    });

    it('should extract endpoint name from useGetUserByIdQuery', () => {
      expect(extractEndpointName('useGetUserByIdQuery')).toBe('getUserById');
    });

    it('should extract endpoint name from useCreateUserMutation', () => {
      expect(extractEndpointName('useCreateUserMutation')).toBe('createUser');
    });

    it('should extract endpoint name from useDeleteUserMutation', () => {
      expect(extractEndpointName('useDeleteUserMutation')).toBe('deleteUser');
    });

    it('should extract endpoint name from useGetUsersInfiniteQuery', () => {
      expect(extractEndpointName('useGetUsersInfiniteQuery')).toBe('getUsers');
    });
  });

  describe('useLazy prefix hooks', () => {
    it('should extract endpoint name from useLazyGetUsersQuery', () => {
      expect(extractEndpointName('useLazyGetUsersQuery')).toBe('getUsers');
    });

    it('should extract endpoint name from useLazyCreateUserMutation', () => {
      expect(extractEndpointName('useLazyCreateUserMutation')).toBe('createUser');
    });

    it('should extract endpoint name from useLazyGetUsersInfiniteQuery', () => {
      expect(extractEndpointName('useLazyGetUsersInfiniteQuery')).toBe('getUsers');
    });
  });

  describe('edge cases', () => {
    it('should return undefined for non-hook names', () => {
      expect(extractEndpointName('getUsers')).toBeUndefined();
    });

    it('should return undefined for regular function names', () => {
      expect(extractEndpointName('handleClick')).toBeUndefined();
    });

    it('should return undefined for use prefix without valid suffix', () => {
      expect(extractEndpointName('useCustomHook')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(extractEndpointName('')).toBeUndefined();
    });

    it('should return undefined for use without endpoint name', () => {
      expect(extractEndpointName('useQuery')).toBeUndefined();
    });

    it('should return undefined for useLazy without endpoint name', () => {
      expect(extractEndpointName('useLazyQuery')).toBeUndefined();
    });

    it('should handle single character endpoint names', () => {
      expect(extractEndpointName('useXQuery')).toBe('x');
    });

    it('should handle endpoint names with numbers', () => {
      expect(extractEndpointName('useGetUser123Query')).toBe('getUser123');
    });

    it('should handle endpoint names starting with uppercase', () => {
      expect(extractEndpointName('useGetUsersQuery')).toBe('getUsers');
    });
  });

  describe('case sensitivity', () => {
    it('should handle all uppercase endpoint name', () => {
      expect(extractEndpointName('useGETUSERSQuery')).toBe('gETUSERS');
    });

    it('should handle mixed case endpoint name', () => {
      expect(extractEndpointName('useGetUsersQuery')).toBe('getUsers');
    });
  });
});
