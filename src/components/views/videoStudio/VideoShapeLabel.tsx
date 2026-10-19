import React from 'react';
import { describeVideoShape } from '../../../lib/videoShape';

/** "Wide 16:9 · fits YouTube, Facebook and LinkedIn" under a finished clip, from its real shape. */
export const VideoShapeLabel: React.FC<{ ratio: number }> = ({ ratio }) => {
  const shape = describeVideoShape(ratio);
  return (
    <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
      <span className="font-semibold text-slate-700 dark:text-slate-200">{shape.name}</span> · fits {shape.fitsOn}
    </p>
  );
};
