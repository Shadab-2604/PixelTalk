/**
 * File: conversationUtils.js
 *
 * Responsibility:
 * Presentation helpers for uniform rendering of conversation entities:
 * - Resolving peer counterpart in 1-on-1 direct messaging (`otherMember`)
 * - Computing conversation display labels and titles (`conversationLabel`)
 * - Resolving avatar identifiers for direct chats vs group lounges (`conversationAvatarId`)
 * - Computing status subtitles with online/lastSeen indicators (`conversationSubtitle`)
 *
 * Layer:
 * Frontend / Conversation Features
 *
 * Connected to:
 * - frontend/features/conversations/ConversationSidebar.jsx
 * - frontend/app/dashboard/page.jsx
 * - frontend/app/chat/[conversationId]/page.jsx
 */

export function otherMember(convo, currentUser) {
  if (!convo?.members || !Array.isArray(convo.members)) return null;
  const myId = currentUser?._id ? currentUser._id.toString() : currentUser?.id ? currentUser.id.toString() : '';
  const found = convo.members.find((m) => {
    const memberId = m?._id ? m._id.toString() : m?.id ? m.id.toString() : m ? m.toString() : '';
    return memberId !== myId;
  });
  return found || convo.members[0] || null;
}

export function conversationLabel(convo, currentUser) {
  if (!convo) return '';
  if (convo.type === 'group') return convo.name || 'Group Room';
  const other = otherMember(convo, currentUser) || convo.otherUser;
  return other?.displayName || (other?.username ? `@${other.username}` : 'Direct chat');
}

export function conversationAvatarId(convo, currentUser) {
  if (convo?.type === 'group') return convo.avatarId || 'avatar-06';
  const other = otherMember(convo, currentUser) || convo?.otherUser;
  return other?.avatarId || 'avatar-01';
}

export function conversationSubtitle(convo, currentUser, isOnlineFn) {
  if (convo?.type === 'group') return `${convo.members?.length || 0} members`;
  const other = otherMember(convo, currentUser) || convo?.otherUser;
  if (!other) return 'Direct chat';
  const online = isOnlineFn ? isOnlineFn(other._id || other.id) : other.presence === 'online';
  return online ? 'Online' : other.lastSeen ? `Last seen ${new Date(other.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline';
}
