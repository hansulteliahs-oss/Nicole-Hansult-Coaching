'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { upload } from '@vercel/blob/client';

import { ideaSchema, IDEA_TAGS, type IdeaInput } from '@/lib/schemas/idea';
import { bankIdeaAction } from '@/lib/actions/idea';

const KEY_STORAGE = 'idea_bank_key';

const fieldClass =
  'w-full rounded-xl border border-inkFaint bg-bg px-4 py-3 text-ink placeholder:text-grayDeep focus:outline-none focus:ring-2 focus:ring-orchidMid transition';
const labelClass = 'block text-sm font-medium text-ink mb-1';
const errorClass = 'mt-1 text-sm text-red-600';
const buttonClass =
  'rounded-xl bg-[#b07bba] px-5 py-3 font-semibold text-white transition hover:opacity-90';

/**
 * Passcode gate wrapper. The key is stashed in localStorage so Nicole enters it
 * once per device; it's still verified server-side on every submit + upload, so
 * localStorage is convenience only, not the security boundary.
 */
export function IdeaForm() {
  const [passKey, setPassKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPassKey(localStorage.getItem(KEY_STORAGE));
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!passKey) {
    const save = () => {
      const k = keyInput.trim();
      if (!k) return;
      localStorage.setItem(KEY_STORAGE, k);
      setPassKey(k);
    };
    return (
      <div className="space-y-3">
        <div>
          <label className={labelClass} htmlFor="idea-key">
            Idea-bank key
          </label>
          <input
            id="idea-key"
            className={fieldClass}
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="Enter your key"
            autoComplete="off"
          />
        </div>
        <button type="button" className={`${buttonClass} w-full`} onClick={save}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <IdeaFormInner
      passKey={passKey}
      onBadKey={() => {
        localStorage.removeItem(KEY_STORAGE);
        setPassKey(null);
        setKeyInput('');
      }}
    />
  );
}

function IdeaFormInner({ passKey, onBadKey }: { passKey: string; onBadKey: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const emptyDefaults: IdeaInput = {
    key: passKey,
    topic: '',
    notes: '',
    tag: 'either',
    imageUrls: [],
    _hp: '',
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IdeaInput>({
    resolver: zodResolver(ideaSchema),
    defaultValues: emptyDefaults,
  });

  const onSubmit = (data: IdeaInput) => {
    setServerError(null);
    startTransition(async () => {
      // 1. Upload photos straight to Blob (if any), collect their URLs.
      let imageUrls: string[] = [];
      if (files.length > 0) {
        setUploading(true);
        try {
          const uploaded = await Promise.all(
            files.slice(0, 5).map((f) =>
              upload(f.name, f, {
                access: 'public',
                handleUploadUrl: '/api/idea/upload',
                clientPayload: passKey,
              }),
            ),
          );
          imageUrls = uploaded.map((u) => u.url);
        } catch {
          setUploading(false);
          setServerError('Photo upload failed. Try again, or send without photos.');
          return;
        }
        setUploading(false);
      }

      // 2. Bank the idea.
      const res = await bankIdeaAction({ ...data, key: passKey, imageUrls });
      if (res.success) {
        reset(emptyDefaults);
        setFiles([]);
        setDone(true);
        return;
      }
      if (res.error === 'bad_key') {
        onBadKey();
        return;
      }
      if (res.error === 'rate_limited') {
        setServerError('Give it a few seconds and try again.');
        return;
      }
      if (res.error === 'invalid') {
        setServerError('Add a topic before sending.');
        return;
      }
      setServerError('Something went wrong saving that. Try again.');
    });
  };

  if (done) {
    return (
      <div className="rounded-xl border border-inkFaint bg-bg p-6 text-center">
        <p className="mb-4 font-medium text-ink">Got it — added to your idea bank ✅</p>
        <button type="button" className={buttonClass} onClick={() => setDone(false)}>
          Add another
        </button>
      </div>
    );
  }

  const busy = isPending || uploading;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Honeypot — visually hidden, off-screen. Bots fill it; humans don't. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0"
        {...register('_hp')}
      />

      <div>
        <label className={labelClass} htmlFor="idea-topic">
          Topic
        </label>
        <input
          id="idea-topic"
          className={fieldClass}
          placeholder="e.g. Why your body feels stiff after 40"
          {...register('topic')}
        />
        {errors.topic && <p className={errorClass}>{errors.topic.message}</p>}
      </div>

      <div>
        <label className={labelClass} htmlFor="idea-notes">
          Notes <span className="text-grayDeep">(optional)</span>
        </label>
        <textarea
          id="idea-notes"
          className={`${fieldClass} min-h-[110px]`}
          placeholder="Any angle, story, or detail you want included."
          {...register('notes')}
        />
      </div>

      <div>
        <span className={labelClass}>Use it for</span>
        <div className="flex gap-2">
          {IDEA_TAGS.map((t) => (
            <label key={t} className="flex-1">
              <input type="radio" value={t} className="peer sr-only" {...register('tag')} />
              <span className="block cursor-pointer rounded-xl border-2 border-inkFaint bg-transparent px-3 py-2 text-center text-sm font-medium capitalize text-ink transition hover:border-[#b07bba] peer-checked:border-[#b07bba] peer-checked:bg-[#b07bba] peer-checked:font-semibold peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#b07bba] peer-focus-visible:ring-offset-1">
                {t}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="idea-photos">
          Photos <span className="text-grayDeep">(optional, up to 5)</span>
        </label>
        <input
          id="idea-photos"
          type="file"
          accept="image/*"
          multiple
          className="block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-orchidMid/10 file:px-3 file:py-2 file:text-ink"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
        />
        {files.length > 0 && (
          <p className="mt-1 text-sm text-grayDeep">
            {files.length} photo{files.length > 1 ? 's' : ''} attached
          </p>
        )}
      </div>

      {serverError && <p className={errorClass}>{serverError}</p>}

      <button type="submit" disabled={busy} className={`${buttonClass} w-full disabled:opacity-60`}>
        {uploading ? 'Uploading photos…' : isPending ? 'Sending…' : 'Send to idea bank'}
      </button>
    </form>
  );
}
