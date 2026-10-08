/**
 * Follow Service
 *
 * Client API methods for following, unfollowing, responding to follow requests,
 * and listing followers/following.
 */

import { get, post } from '@/lib/api';

export const followService = {
  follow: (targetUserId) => post(`/users/${targetUserId}/follow`),
  unfollow: (targetUserId) => post(`/users/${targetUserId}/unfollow`),
  respondFollowRequest: (followerId, action) =>
    post(`/users/follow-requests/${followerId}/respond`, { action }),
  getPendingRequests: () => get('/users/follow-requests/pending'),
  getFollowers: (userId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return get(`/users/${userId}/followers${query ? `?${query}` : ''}`);
  },
  getFollowing: (userId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return get(`/users/${userId}/following${query ? `?${query}` : ''}`);
  },
  getCounts: async (userId) => {
    const res = await get(`/users/${userId}`);
    return {
      followersCount: res.user?.followersCount || 0,
      followingCount: res.user?.followingCount || 0,
    };
  },
};
