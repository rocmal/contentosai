import React from 'react';
import { MapPin } from 'lucide-react';
import { MobilePost } from './types';
import { platformLabel, platformTagClasses, statusClasses, statusLabel } from './postDisplay';

interface PostDetailSheetProps {
  post: MobilePost;
  onClose: () => void;
}

export const PostDetailSheet: React.FC<PostDetailSheetProps> = ({ post, onClose }) => {
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-slate-900/45" onClick={onClose} />
      <div className="absolute left-0 right-0 bottom-0 bg-slate-100 rounded-t-[28px] px-5 pt-5 pb-[calc(26px+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(15,23,42,0.22)] flex flex-col gap-3.5">
        <div className="w-10 h-1 rounded-full bg-slate-400 self-center" />
        <div className="flex items-center justify-between">
          <span className={platformTagClasses}>{platformLabel(post.platform)}</span>
          <span className={statusClasses(post.status)}>{statusLabel(post.status)}</span>
        </div>
        <h3 className="m-0 font-display text-lg text-slate-900">{post.title}</h3>
        <div className="flex items-center gap-1.5 text-[12.5px] text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-blue-700" />
          <span>{post.time}</span>
        </div>
        {post.permalink && (
          <a href={post.permalink} target="_blank" rel="noreferrer" className="text-[12.5px] text-blue-700 font-semibold">
            View live post
          </a>
        )}
        <div className="flex gap-2.5 mt-1.5">
          <a
            href="/#calendar"
            className="flex-1 h-11 rounded-full bg-white text-slate-900 border border-slate-200 font-bold flex items-center justify-center"
          >
            Edit
          </a>
          <button onClick={onClose} className="flex-1 h-11 rounded-full bg-blue-600 text-white font-bold">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
