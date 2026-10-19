import { useEffect, useState } from 'react';
import * as api from '../../../lib/api';
import { OutputAspectRatio } from '../../../lib/videoCompositor';
import { AiStylePreset, CreateSource, Step } from './constants';

/** Saved video templates: the list on the Templates tab, and "Save as template" on the result step. */
export function useVideoTemplates({ user, source, step, finalVideoUrl, prompt, overlayText, aspectRatio, sceneAspectRatio, sceneSaveAsTemplate }: {
  user: api.AuthUser | null;
  source: CreateSource;
  step: Step;
  finalVideoUrl: string | null;
  prompt: string;
  overlayText: string;
  aspectRatio: AiStylePreset['aspectRatio'];
  sceneAspectRatio: OutputAspectRatio;
  sceneSaveAsTemplate: boolean;
}) {
  const [videoTemplates, setVideoTemplates] = useState<api.VideoTemplate[]>([]);

  // Save-as-template (from the result screen)
  const [showSaveTemplatePanel, setShowSaveTemplatePanel] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [saveTemplateError, setSaveTemplateError] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateVisibility, setTemplateVisibility] = useState<api.VideoTemplateVisibility>('private');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveTemplateStatus, setSaveTemplateStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const loadVideoTemplates = () => {
    api
      .listVideoTemplates()
      .then((items) => {
        setVideoTemplates(items);
        setTemplatesError(null);
      })
      .catch((err) =>
        setTemplatesError(err instanceof api.ApiError ? err.message : 'Could not load your saved templates.'),
      );
  };

  // Reload whenever the Templates tab is opened, so a template saved a moment ago shows up.
  useEffect(() => {
    if (source === 'templates') loadVideoTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const handleOpenSaveTemplatePanel = () => {
    if (!templateTitle.trim()) {
      setTemplateTitle(prompt.trim() || overlayText.trim() || 'My video template');
    }
    setSaveTemplateStatus('idle');
    setShowSaveTemplatePanel((v) => !v);
  };

  const handleSaveTemplate = async () => {
    if (!finalVideoUrl || !templateTitle.trim() || !user?.organizationId || !user?.workspaceId) {
      // Say why instead of doing nothing, so a save that never starts is not mistaken for one that worked.
      setSaveTemplateError(
        !templateTitle.trim()
          ? 'Give the template a name first.'
          : !user?.organizationId || !user?.workspaceId
            ? 'Your account has no active workspace yet. Please sign out and in again.'
            : 'There is no finished video to save yet.',
      );
      setSaveTemplateStatus('error');
      return;
    }

    setIsSavingTemplate(true);
    setSaveTemplateStatus('idle');
    try {
      const videoBlob = await fetch(finalVideoUrl).then((r) => r.blob());
      const saved = await api.saveVideoTemplate({
        organizationId: user.organizationId,
        workspaceId: user.workspaceId,
        title: templateTitle.trim(),
        videoBlob,
        aspectRatio: source === 'scenes' ? sceneAspectRatio : aspectRatio,
        visibility: templateVisibility,
      });
      setVideoTemplates((prev) => [saved, ...prev]);
      setSaveTemplateStatus('saved');
      setSaveTemplateError(null);
    } catch (err) {
      setSaveTemplateError(
        err instanceof api.ApiError && err.status === 413
          ? 'This video is too large to save as a template (the limit is 25 MB). Try a shorter video.'
          : err instanceof api.ApiError
            ? err.message
            : 'Could not reach the Lumora API.',
      );
      setSaveTemplateStatus('error');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // "Also save as a template" was checked back in the Scene Builder panel,
  // before Generate was even clicked - the actual save can only happen once
  // there's a finished clip to attach it to, so it fires here the moment the
  // scene-builder flow reaches the result step. Reuses the same
  // save-as-template panel/state as the manual "Save as template" button
  // (see handleOpenSaveTemplatePanel) so the confirmation/error UI matches.
  useEffect(() => {
    if (step !== 'result' || !finalVideoUrl) return;
    if (source !== 'scenes' || !sceneSaveAsTemplate) return;
    if (isSavingTemplate || saveTemplateStatus !== 'idle') return;
    setShowSaveTemplatePanel(true);
    void handleSaveTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, finalVideoUrl, source, sceneSaveAsTemplate]);

  useEffect(() => {
    loadVideoTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** "Start over": the save-as-template panel closed and empty. */
  const resetTemplatePanel = () => {
    setShowSaveTemplatePanel(false);
    setTemplateTitle('');
    setTemplateVisibility('private');
    setSaveTemplateStatus('idle');
  };

  return {
    handleOpenSaveTemplatePanel,
    handleSaveTemplate,
    isSavingTemplate,
    resetTemplatePanel,
    saveTemplateError,
    saveTemplateStatus,
    setShowSaveTemplatePanel,
    setTemplateTitle,
    setTemplateVisibility,
    showSaveTemplatePanel,
    templateTitle,
    templateVisibility,
    templatesError,
    videoTemplates,
  };
}

export type VideoTemplates = ReturnType<typeof useVideoTemplates>;
