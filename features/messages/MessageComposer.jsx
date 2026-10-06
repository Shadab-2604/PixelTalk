'use client';

import { useState, useRef } from 'react';
import { messageService } from '@/services/messageService';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { EmojiPicker } from '@/components/EmojiPicker';
import { ErrorText, Spinner } from '@/components/ui';
import { sfx } from '@/lib/sound';

export function MessageComposer({
  onSend,
  disabled,
  disabledMessage,
  placeholder,
  onTyping,
  replyToMessage = null,
  onCancelReply = () => {},
  editingMessage = null,
  onCancelEdit = () => {},
}) {
  const [text, setText] = useState(editingMessage?.content || '');
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('Image file size exceeds the maximum limit of 25 MB.');
      sfx.error();
      return;
    }

    if (!file.type.toLowerCase().startsWith('image/')) {
      setUploadError('Only image files (JPG, PNG, WEBP, GIF) are allowed.');
      sfx.error();
      return;
    }

    setUploadError('');
    setSelectedImageFile(file);
    setPreviewModalOpen(true);
    e.target.value = '';
  };

  const handleSendImageUpload = async (fileToUpload) => {
    setUploading(true);
    setUploadError('');
    try {
      const res = await messageService.uploadMedia(fileToUpload);
      const media = res?.media || res;
      onSend({
        content: text.trim(),
        messageType: 'image',
        media,
        replyTo: replyToMessage?._id || replyToMessage?.id || null,
      });

      setText('');
      setSelectedImageFile(null);
      setPreviewModalOpen(false);
      if (replyToMessage) onCancelReply();
      inputRef.current?.focus();
    } catch (err) {
      setUploadError(err.message || 'Image upload failed');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const submitTextOnly = (e) => {
    e?.preventDefault();
    const content = text.trim();
    if (!content || disabled || uploading) return;

    onSend({
      content,
      messageType: 'text',
      media: null,
      replyTo: replyToMessage?._id || replyToMessage?.id || null,
    });

    setText('');
    setUploadError('');
    if (replyToMessage) onCancelReply();
    inputRef.current?.focus();
  };

  const formatReplySnippet = (msg) => {
    if (!msg) return '';
    if (msg.deletedAt) return 'Message deleted';
    if (msg.media) {
      return msg.content ? `[IMAGE] ${msg.content}` : `[IMAGE] ${msg.media.fileName || 'Photo'}`;
    }
    return msg.content || '';
  };

  return (
    <div className="space-y-2">
      {/* Upload Error banner */}
      {uploadError && <ErrorText>{uploadError}</ErrorText>}

      {/* Reply-To Preview Banner */}
      {replyToMessage && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary-container/60 border border-tertiary/30 font-mono text-label-sm">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="material-symbols-outlined text-primary text-[18px]">reply</span>
            <div className="min-w-0">
              <span className="font-bold text-primary">Replying to @{replyToMessage.senderId?.username || 'player'}</span>
              <p className="text-on-surface-variant truncate text-[11px] mt-0.5">{formatReplySnippet(replyToMessage)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="w-6 h-6 rounded-md bg-surface text-tertiary hover:text-on-surface flex items-center justify-center border border-tertiary/20 shrink-0"
            title="Cancel reply"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}

      {/* Edit Message Banner */}
      {editingMessage && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 font-mono text-label-sm">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="material-symbols-outlined text-amber-600 text-[18px]">edit</span>
            <div className="min-w-0">
              <span className="font-bold text-amber-600">Editing Message</span>
              <p className="text-on-surface-variant truncate text-[11px] mt-0.5">{editingMessage.content}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="w-6 h-6 rounded-md bg-surface text-tertiary hover:text-on-surface flex items-center justify-center border border-tertiary/20 shrink-0"
            title="Cancel edit"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}

      {disabledMessage ? (
        <div className="bg-surface-container rounded-xl border-2 border-tertiary/30 p-3.5 text-center flex items-center justify-center gap-2.5 shadow-pixel-sm">
          <span className="material-symbols-outlined text-primary text-[20px]">lock</span>
          <span className="font-mono text-label-md text-on-surface font-bold">{disabledMessage}</span>
        </div>
      ) : (
        <form
          onSubmit={submitTextOnly}
          className="bg-surface-container-lowest rounded-xl border-2 border-tertiary/30 p-2 shadow-pixel-sm focus-within:border-primary transition-all"
        >
          <div className="flex items-center px-1">
            <input
              ref={inputRef}
              className="w-full bg-transparent border-none p-2 text-base sm:text-body-md font-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-0"
              placeholder={placeholder || 'Type your message...'}
              value={text}
              maxLength={2000}
              onChange={(e) => {
                setText(e.target.value);
                onTyping?.();
              }}
              disabled={disabled || uploading}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-tertiary/10 mt-1 px-1">
            <div className="flex items-center gap-1">
              {/* Image Attachment Button */}
              <label
                className="w-8 h-8 rounded-lg flex items-center justify-center text-tertiary hover:text-primary hover:bg-surface-container cursor-pointer transition-all"
                title="Attach Photo or Image (JPG, PNG, WEBP, GIF max 25MB)"
              >
                <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={disabled || uploading}
                  onChange={handleImageFileChange}
                />
              </label>

              {/* Emoji Picker Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    showEmojiPicker
                      ? 'text-primary bg-secondary-container'
                      : 'text-tertiary hover:text-primary hover:bg-surface-container'
                  }`}
                  title="Insert Emoji"
                  disabled={disabled || uploading}
                >
                  <span className="material-symbols-outlined text-[20px]">mood</span>
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-full mb-2 left-0 z-30">
                    <EmojiPicker
                      onSelect={(emoji) => {
                        setText((prev) => prev + emoji);
                        inputRef.current?.focus();
                      }}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {uploading && (
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-primary">
                  <Spinner />
                  <span>Uploading…</span>
                </div>
              )}

              <button
                type="submit"
                disabled={disabled || uploading || !text.trim()}
                className="flex items-center gap-1.5 bg-primary-container text-surface-container font-mono text-label-md font-bold px-4 py-2 rounded-lg border border-tertiary shadow-pixel-sm-solid hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40"
              >
                <span>SEND</span>
                <span className="font-mono text-sm leading-none">↵</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Image Preview & Crop Modal */}
      <ImagePreviewModal
        open={previewModalOpen}
        file={selectedImageFile}
        onClose={() => {
          setPreviewModalOpen(false);
          setSelectedImageFile(null);
        }}
        onSendImage={handleSendImageUpload}
        disabled={uploading}
      />
    </div>
  );
}

