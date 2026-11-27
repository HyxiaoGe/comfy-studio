import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clapperboard, Plus } from 'lucide-react';
import {
  ACTIVE_BATCH_KEY,
  ASPECT_RATIOS,
  CUSTOM_CHIPS_KEY,
  MOTION_CYCLE,
  STORY_PRESETS,
} from './data/presets';
import { useToast } from './components/ui/ToastProvider';
import TopBar from './components/TopBar';
import DnaSidebar from './components/DnaSidebar';
import ShotCard from './components/ShotCard';
import ComposePanel from './components/ComposePanel';
import HistoryDrawer from './components/HistoryDrawer';
import Lightbox from './components/Lightbox';

function randomSeed() {
  return Math.floor(Math.random() * 2147483647) + 1;
}

function loadCustomChips() {
  try {
    const arr = JSON.parse(localStorage.getItem(CUSTOM_CHIPS_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function App() {
  const { pushToast } = useToast();

  const uidRef = useRef(1);
  const nextUid = useCallback(() => `shot_${uidRef.current++}`, []);

  const [mode, setMode] = useState('storyboard');
  const [projectId, setProjectId] = useState(null);
  const [title, setTitle] = useState('清晨厨房的猫');
  const [selectedPresetId, setSelectedPresetId] = useState(STORY_PRESETS[0].id);
  const [prefix, setPrefix] = useState(STORY_PRESETS[0].prefix);
  const [negativePrompt, setNegativePrompt] = useState(STORY_PRESETS[0].negative);
  const [seed, setSeed] = useState(42);
  const [autoRandomize, setAutoRandomize] = useState(false);
  const [aspectValue, setAspectValue] = useState('1344x768');
  const [shots, setShots] = useState([]);
  const [customChips, setCustomChips] = useState(() => loadCustomChips());
  const [saveState, setSaveState] = useState('saved');

  // DeepSeek narration, TTS & compose audio/subtitle options
  const [narrationStyle, setNarrationStyle] = useState('绘本故事');
  const [generatingNarration, setGeneratingNarration] = useState(false);
  const [ttsVoice, setTtsVoice] = useState('Cherry');
  const [generatingTts, setGeneratingTts] = useState(false);
  const [ttsBusyUid, setTtsBusyUid] = useState('');
  const [transitionType, setTransitionType] = useState('fade');
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [autoAlignTts, setAutoAlignTts] = useState(true);
  const [audioFiles, setAudioFiles] = useState([]);
  const [bgmFilename, setBgmFilename] = useState('');
  const [bgmVolume, setBgmVolume] = useState(0.32);

  const [health, setHealth] = useState(null);
  const [gpuProgress, setGpuProgress] = useState({ text: '显卡队列：空闲', done: 0, total: 1, busy: false });
  const [batchRunning, setBatchRunning] = useState(false);
  const [composing, setComposing] = useState(false);
  const [composeState, setComposeState] = useState({
    visible: false,
    done: 0,
    total: 1,
    stage: '',
    videoUrl: '',
    filename: '',
    cacheBust: 1,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [historyProjects, setHistoryProjects] = useState([]);
  const [historyComps, setHistoryComps] = useState([]);
  const [lightboxSrc, setLightboxSrc] = useState('');

  const batchTimerRef = useRef(null);
  const composeTimerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const initializedRef = useRef(false);

  const stateRef = useRef({});
  stateRef.current = {
    projectId,
    title,
    mode,
    prefix,
    negativePrompt,
    seed,
    aspectValue,
    shots,
  };

  const aspect = useMemo(
    () => ASPECT_RATIOS.find((a) => a.value === aspectValue) || ASPECT_RATIOS[0],
    [aspectValue]
  );

  const buildShot = useCallback(
    (prompt = '', idx = 0, narration = '') => ({
      uid: nextUid(),
      prompt,
      narration,
      ttsFilename: '',
      ttsDuration: 0,
      motion: MOTION_CYCLE[idx % MOTION_CYCLE.length],
      duration: 4,
      filename: '',
      imgVer: 0,
      seed: null,
      status: 'idle',
      error: '',
    }),
    [nextUid]
  );

  const saveProjectNow = useCallback(async (overrideState = null) => {
    clearTimeout(saveTimerRef.current);
    setSaveState('saving');
    const cur = overrideState || stateRef.current;
    const asp = ASPECT_RATIOS.find((a) => a.value === cur.aspectValue) || ASPECT_RATIOS[0];
    const payload = {
      id: cur.projectId || '',
      title: (cur.title || '').trim() || '未命名分镜项目',
      mode: cur.mode || 'storyboard',
      prefix: cur.prefix || '',
      negative_prompt: cur.negativePrompt || '',
      seed: Number.isFinite(cur.seed) ? cur.seed : 42,
      width: asp.width,
      height: asp.height,
      shots: (cur.shots || []).map((s) => ({
        uid: s.uid,
        prompt: s.prompt,
        narration: s.narration || '',
        ttsFilename: s.ttsFilename || '',
        ttsDuration: s.ttsDuration || 0,
        motion: s.motion,
        duration: s.duration,
        filename: s.filename || '',
        imgVer: s.imgVer || 0,
        seed: s.seed ?? null,
        status: s.filename ? 'ready' : s.status === 'error' ? 'error' : 'idle',
        error: s.error || '',
      })),
    };
    try {
      const r = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (r.ok && data.project) {
        setProjectId(data.project.id);
        stateRef.current.projectId = data.project.id;
        setSaveState('saved');
        return data.project;
      }
      setSaveState('error');
    } catch {
      setSaveState('error');
    }
    return null;
  }, []);

  const scheduleSave = useCallback(() => {
    if (!initializedRef.current) return;
    setSaveState('saving');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveProjectNow();
    }, 500);
  }, [saveProjectNow]);

  const fetchLists = useCallback(async () => {
    try {
      const [pr, cr, ar] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/compositions'),
        fetch('/api/audio'),
      ]);
      const [pd, cd, ad] = await Promise.all([pr.json(), cr.json(), ar.json()]);
      if (pr.ok) setHistoryProjects(pd.projects || []);
      if (cr.ok) setHistoryComps(cd.compositions || []);
      if (ar.ok) setAudioFiles(ad.files || []);
    } catch {
      // ignore
    }
  }, []);

  const restoreCompositionForProject = useCallback(async (pid) => {
    try {
      const r = await fetch('/api/compositions');
      const data = await r.json();
      const list = data.compositions || [];
      setHistoryComps(list);
      const match = list.find((c) => c.status === 'done' && c.file_exists && c.project_id === pid);
      if (match) {
        setComposeState({
          visible: true,
          done: 1,
          total: 1,
          stage: `成片就绪 · ${match.width}×${match.height} · ${match.duration}s · 编码器 ${match.encoder || 'h264'}`,
          videoUrl: match.video_url,
          filename: match.filename,
          cacheBust: Date.now(),
        });
      } else {
        setComposeState((prev) => ({ ...prev, visible: false, videoUrl: '' }));
      }
    } catch {
      // ignore
    }
  }, []);

  const applyProjectRecord = useCallback((proj) => {
    if (!proj) return;
    setProjectId(proj.id);
    setTitle(proj.title || '未命名分镜项目');
    setPrefix(proj.prefix || '');
    setNegativePrompt(proj.negative_prompt || '');
    setSeed(typeof proj.seed === 'number' ? proj.seed : 42);
    const av = `${proj.width || 1344}x${proj.height || 768}`;
    if (ASPECT_RATIOS.some((a) => a.value === av)) {
      setAspectValue(av);
    }
    const hydrated = (proj.shots || []).map((s, idx) => {
      const m = /^shot_(\d+)$/.exec(s.uid || '');
      if (m) uidRef.current = Math.max(uidRef.current, Number(m[1]) + 1);
      return {
        uid: s.uid || `shot_${uidRef.current++}`,
        prompt: s.prompt || '',
        narration: s.narration || '',
        ttsFilename: s.ttsFilename || '',
        ttsDuration: Number(s.ttsDuration) || 0,
        motion: s.motion || MOTION_CYCLE[idx % MOTION_CYCLE.length],
        duration: Number(s.duration) || 4,
        filename: s.filename || '',
        imgVer: Number(s.imgVer) || (s.filename ? 1 : 0),
        seed: typeof s.seed === 'number' ? s.seed : null,
        status: s.filename ? 'ready' : s.status === 'error' ? 'error' : 'idle',
        error: s.error || '',
      };
    });
    setShots(hydrated);
    setMode(proj.mode === 'video' ? 'video' : 'storyboard');
    setSaveState('saved');
  }, []);

  const applyPreset = useCallback(
    async (presetId, { asNew = true } = {}) => {
      const preset = STORY_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      setSelectedPresetId(preset.id);
      const nextShots = preset.prompts.map((p, idx) => buildShot(p, idx));
      const nextState = {
        projectId: asNew ? '' : stateRef.current.projectId,
        title: preset.name,
        mode: stateRef.current.mode || 'storyboard',
        prefix: preset.prefix,
        negativePrompt: preset.negative,
        seed: preset.seed,
        aspectValue: stateRef.current.aspectValue || '1344x768',
        shots: nextShots,
      };
      if (asNew) {
        setProjectId(null);
        setComposeState((prev) => ({ ...prev, visible: false, videoUrl: '' }));
      }
      setTitle(nextState.title);
      setPrefix(nextState.prefix);
      setNegativePrompt(nextState.negativePrompt);
      setSeed(nextState.seed);
      setShots(nextShots);
      await saveProjectNow(nextState);
      fetchLists();
      pushToast(asNew ? `已新建模板项目：${preset.name}` : `已重置模板：${preset.name}`, 'info');
    },
    [buildShot, fetchLists, pushToast, saveProjectNow]
  );

  const refreshHealth = useCallback(async () => {
    try {
      const r = await fetch('/api/health');
      const h = await r.json();
      setHealth(h);
      if (!batchRunning) {
        if (h.active_job) {
          setGpuProgress({
            text: `后台队列：${h.active_job.done}/${h.active_job.total}`,
            done: h.active_job.done,
            total: h.active_job.total,
            busy: true,
          });
        } else {
          setGpuProgress({
            text: h.queued ? `排队中 (${h.queued})` : '显卡队列：空闲',
            done: 0,
            total: 1,
            busy: false,
          });
        }
      }
    } catch {
      setHealth(null);
    }
  }, [batchRunning]);

  const resumeBatchPolling = useCallback(
    (jobId, submittedUids) => {
      setBatchRunning(true);
      clearInterval(batchTimerRef.current);

      const pollOnce = async () => {
        try {
          const sr = await fetch(`/api/status/${jobId}`);
          const sj = await sr.json();
          if (!sr.ok) throw new Error(sj.error || `HTTP ${sr.status}`);

          let anyChanged = false;
          setShots((prev) =>
            prev.map((card) => {
              const idx = submittedUids.indexOf(card.uid);
              if (idx === -1) return card;
              const item = (sj.items || [])[idx];
              if (item && card.filename !== item.filename) {
                anyChanged = true;
                return {
                  ...card,
                  filename: item.filename,
                  seed: item.seed,
                  imgVer: (card.imgVer || 0) + 1,
                  status: 'ready',
                  error: '',
                };
              }
              if (sj.status === 'running' && idx === Math.max(0, (sj.current_index || 1) - 1) && !card.filename) {
                return { ...card, status: 'running', error: '' };
              }
              if (sj.status === 'queued' && !card.filename) {
                return { ...card, status: 'queued', error: '' };
              }
              if ((sj.status === 'failed' || sj.status === 'interrupted') && !card.filename) {
                anyChanged = true;
                return { ...card, status: 'error', error: sj.error || '生成中断或失败' };
              }
              return card;
            })
          );

          if (sj.status === 'running') {
            setGpuProgress({
              text: `生成第 ${Math.min(sj.done + 1, sj.total)}/${sj.total} 镜`,
              done: sj.done,
              total: sj.total,
              busy: true,
            });
          } else if (sj.status === 'queued') {
            setGpuProgress({ text: `排队中（共 ${sj.total} 镜）`, done: 0, total: sj.total, busy: true });
          } else if (sj.status === 'done') {
            clearInterval(batchTimerRef.current);
            setBatchRunning(false);
            localStorage.removeItem(ACTIVE_BATCH_KEY);
            setGpuProgress({ text: `全部完成 ${sj.done}/${sj.total}`, done: sj.done, total: sj.total, busy: false });
            anyChanged = true;
            pushToast(`分镜全部生成完成（${sj.done}/${sj.total}）`, 'success');
            refreshHealth();
          } else if (sj.status === 'failed' || sj.status === 'interrupted') {
            clearInterval(batchTimerRef.current);
            setBatchRunning(false);
            localStorage.removeItem(ACTIVE_BATCH_KEY);
            setGpuProgress({ text: `任务未完成：${sj.error || '已中断'}`, done: sj.done, total: sj.total, busy: false });
            anyChanged = true;
            pushToast(sj.error || '批量生成中断', 'error');
            refreshHealth();
          }

          if (anyChanged) {
            setTimeout(() => saveProjectNow(), 50);
          }
        } catch {
          clearInterval(batchTimerRef.current);
          setBatchRunning(false);
          localStorage.removeItem(ACTIVE_BATCH_KEY);
          setGpuProgress({ text: '状态轮询异常', done: 0, total: 1, busy: false });
        }
      };

      batchTimerRef.current = setInterval(pollOnce, 1800);
      pollOnce();
    },
    [pushToast, refreshHealth, saveProjectNow]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let restoredProj = null;
      try {
        const r = await fetch('/api/projects/latest');
        const data = await r.json();
        if (!cancelled && r.ok && data.project) {
          restoredProj = data.project;
          applyProjectRecord(data.project);
          await restoreCompositionForProject(data.project.id);
        }
      } catch {
        // ignore
      }

      if (!cancelled && !restoredProj) {
        const p0 = STORY_PRESETS[0];
        const initShots = p0.prompts.map((p, idx) => buildShot(p, idx));
        setShots(initShots);
        await saveProjectNow({
          projectId: '',
          title: p0.name,
          mode: 'storyboard',
          prefix: p0.prefix,
          negativePrompt: p0.negative,
          seed: p0.seed,
          aspectValue: '1344x768',
          shots: initShots,
        });
      }

      if (!cancelled) {
        initializedRef.current = true;
        fetchLists();
        try {
          const raw = localStorage.getItem(ACTIVE_BATCH_KEY);
          if (raw) {
            const saved = JSON.parse(raw);
            const activePid = restoredProj?.id || stateRef.current.projectId;
            if (saved?.job_id && Array.isArray(saved.submittedUids) && saved.project_id === activePid) {
              resumeBatchPolling(saved.job_id, saved.submittedUids);
            } else {
              localStorage.removeItem(ACTIVE_BATCH_KEY);
            }
          }
        } catch {
          localStorage.removeItem(ACTIVE_BATCH_KEY);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(batchTimerRef.current);
      clearInterval(composeTimerRef.current);
      clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshHealth();
    const id = setInterval(refreshHealth, 8000);
    return () => clearInterval(id);
  }, [refreshHealth]);

  const handleGenerateNarration = async () => {
    if (!shots.length) return;
    setGeneratingNarration(true);
    try {
      const r = await fetch('/api/narration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          prefix,
          style: narrationStyle,
          shots: shots.map((s) => ({ prompt: s.prompt, duration: s.duration })),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      const arr = data.narrations || [];
      setShots((prev) =>
        prev.map((s, idx) => ({
          ...s,
          narration: typeof arr[idx] === 'string' ? arr[idx] : s.narration,
          ttsFilename: typeof arr[idx] === 'string' ? '' : s.ttsFilename,
          ttsDuration: typeof arr[idx] === 'string' ? 0 : s.ttsDuration,
        }))
      );
      setTimeout(() => saveProjectNow(), 50);
      pushToast(`已用 ${data.model || 'DeepSeek'} 生成 ${arr.length} 条中文解说词`, 'success');
    } catch (e) {
      pushToast(e.message, 'error');
    } finally {
      setGeneratingNarration(false);
    }
  };

  const handleGenerateTts = async (targetUid = null) => {
    const candidates = shots.filter(
      (s) => (!targetUid || s.uid === targetUid) && (s.narration || '').trim().length > 0
    );
    if (!candidates.length) {
      pushToast('请先填写或生成中文旁白文案', 'error');
      return;
    }
    if (targetUid) {
      setTtsBusyUid(targetUid);
    } else {
      setGeneratingTts(true);
    }
    try {
      const r = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: ttsVoice,
          items: candidates.map((s) => ({ uid: s.uid, text: s.narration.trim() })),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      const byUid = Object.fromEntries((data.results || []).map((x) => [x.uid, x]));
      setShots((prev) =>
        prev.map((s) => {
          const hit = byUid[s.uid];
          if (!hit) return s;
          return {
            ...s,
            ttsFilename: hit.filename,
            ttsDuration: hit.duration || 0,
          };
        })
      );
      setTimeout(() => saveProjectNow(), 50);
      pushToast(`已完成 ${data.results?.length || 0} 条语音合成 (${ttsVoice})`, 'success');
    } catch (e) {
      pushToast(e.message, 'error');
    } finally {
      setGeneratingTts(false);
      setTtsBusyUid('');
    }
  };

  const handleUploadAudio = async (file) => {
    try {
      const buf = await file.arrayBuffer();
      const r = await fetch('/api/upload-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Filename': encodeURIComponent(file.name),
        },
        body: buf,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      await fetchLists();
      setBgmFilename(data.filename);
      pushToast(`已上传背景音乐：${data.filename}`, 'success');
    } catch (e) {
      pushToast(`上传失败：${e.message}`, 'error');
    }
  };

  const handleUploadShotImage = async (uid, file) => {
    try {
      const buf = await file.arrayBuffer();
      const r = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Filename': encodeURIComponent(file.name),
        },
        body: buf,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setShots((prev) =>
        prev.map((s) =>
          s.uid === uid
            ? {
                ...s,
                filename: data.filename,
                seed: null,
                imgVer: (s.imgVer || 0) + 1,
                status: 'ready',
                error: '',
              }
            : s
        )
      );
      setTimeout(() => saveProjectNow(), 50);
      pushToast('已替换为本地图片', 'success');
    } catch (e) {
      pushToast(`图片上传失败：${e.message}`, 'error');
    }
  };

  const handleRunBatch = async () => {
    const activeShots = shots.filter((s) => s.prompt.trim().length > 0);
    if (!activeShots.length) {
      pushToast('请至少填写一个分镜提示词', 'error');
      return;
    }

    let nextSeed = seed;
    if (autoRandomize) {
      nextSeed = randomSeed();
      setSeed(nextSeed);
    }
    const saved = await saveProjectNow({ ...stateRef.current, seed: nextSeed });
    const pid = saved?.id || projectId || '';
    const submittedUids = activeShots.map((s) => s.uid);

    setBatchRunning(true);
    setShots((prev) =>
      prev.map((s) =>
        submittedUids.includes(s.uid) ? { ...s, status: 'queued', error: '' } : s
      )
    );
    setGpuProgress({ text: '正在提交批量队列…', done: 0, total: activeShots.length, busy: true });

    try {
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: pid,
          prompts: activeShots.map((s) => s.prompt.trim()),
          prefix: prefix.trim(),
          negative_prompt: negativePrompt,
          seed: nextSeed,
          width: aspect.width,
          height: aspect.height,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);

      localStorage.setItem(
        ACTIVE_BATCH_KEY,
        JSON.stringify({ job_id: data.job_id, project_id: pid, submittedUids })
      );
      resumeBatchPolling(data.job_id, submittedUids);
    } catch (e) {
      setBatchRunning(false);
      setShots((prev) =>
        prev.map((s) =>
          submittedUids.includes(s.uid) ? { ...s, status: 'error', error: e.message } : s
        )
      );
      setGpuProgress({ text: '提交失败', done: 0, total: 1, busy: false });
      pushToast(`提交失败：${e.message}`, 'error');
    }
  };

  const handleRerollShot = async (uid) => {
    const target = shots.find((s) => s.uid === uid);
    if (!target) return;
    const prompt = target.prompt.trim();
    if (!prompt) {
      setShots((prev) =>
        prev.map((s) => (s.uid === uid ? { ...s, status: 'error', error: '请先填写这一镜的场景描述' } : s))
      );
      return;
    }

    let pid = projectId;
    if (!pid) {
      const saved = await saveProjectNow();
      pid = saved?.id || '';
    }
    const nextSeed = (typeof target.seed === 'number' ? target.seed : seed) + 1;

    setShots((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, status: 'queued', error: '' } : s))
    );

    try {
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: pid || '',
          prompts: [prompt],
          prefix: prefix.trim(),
          negative_prompt: negativePrompt,
          seed: nextSeed,
          width: aspect.width,
          height: aspect.height,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);

      const timer = setInterval(async () => {
        try {
          const sr = await fetch(`/api/status/${data.job_id}`);
          const sj = await sr.json();
          if (sj.status === 'done' && sj.items?.length) {
            clearInterval(timer);
            setShots((prev) =>
              prev.map((s) =>
                s.uid === uid
                  ? {
                      ...s,
                      filename: sj.items[0].filename,
                      seed: sj.items[0].seed,
                      imgVer: (s.imgVer || 0) + 1,
                      status: 'ready',
                      error: '',
                    }
                  : s
              )
            );
            setTimeout(() => saveProjectNow(), 50);
            refreshHealth();
            pushToast('单镜重绘完成', 'success');
          } else if (sj.status === 'failed' || sj.status === 'interrupted') {
            clearInterval(timer);
            setShots((prev) =>
              prev.map((s) =>
                s.uid === uid ? { ...s, status: 'error', error: sj.error || '重绘失败' } : s
              )
            );
            setTimeout(() => saveProjectNow(), 50);
            refreshHealth();
          } else {
            const nextStatus = sj.status === 'queued' ? 'queued' : 'running';
            setShots((prev) =>
              prev.map((s) => (s.uid === uid && s.status !== nextStatus ? { ...s, status: nextStatus } : s))
            );
          }
        } catch (err) {
          clearInterval(timer);
          setShots((prev) =>
            prev.map((s) => (s.uid === uid ? { ...s, status: 'error', error: err.message } : s))
          );
        }
      }, 1800);
    } catch (e) {
      setShots((prev) =>
        prev.map((s) => (s.uid === uid ? { ...s, status: 'error', error: e.message } : s))
      );
      pushToast(`重绘提交失败：${e.message}`, 'error');
    }
  };

  const handleCompose = async () => {
    const readyShots = shots.filter((s) => Boolean(s.filename));
    if (!readyShots.length) return;
    const saved = await saveProjectNow();
    const pid = saved?.id || projectId || '';

    setComposing(true);
    setComposeState({
      visible: true,
      done: 0,
      total: readyShots.length + 1,
      stage: '正在提交 FFmpeg 运镜合成队列…',
      videoUrl: '',
      filename: '',
      cacheBust: Date.now(),
    });

    try {
      const r = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: pid,
          shots: readyShots.map((s) => ({
            filename: s.filename,
            motion: s.motion,
            duration: s.duration,
            narration: s.narration || '',
            tts_filename: s.ttsFilename || '',
          })),
          width: aspect.width,
          height: aspect.height,
          fps: 30,
          transition: transitionType === 'none' ? 0 : 0.5,
          transition_type: transitionType,
          burn_subtitles: burnSubtitles,
          auto_align_tts: autoAlignTts,
          bgm_filename: bgmFilename,
          bgm_volume: bgmVolume,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);

      clearInterval(composeTimerRef.current);
      const pollCompose = async () => {
        try {
          const cr = await fetch(`/api/compose/${data.compose_id}`);
          const cj = await cr.json();
          if (cj.status === 'done') {
            clearInterval(composeTimerRef.current);
            setComposing(false);
            setComposeState({
              visible: true,
              done: cj.total,
              total: cj.total,
              stage: `合成完成 · ${cj.width}×${cj.height} · ${cj.duration}s · 编码器 ${cj.encoder}`,
              videoUrl: cj.video_url,
              filename: cj.filename,
              cacheBust: Date.now(),
            });
            fetchLists();
            pushToast(`运镜成片合成完成 (${cj.duration}s)`, 'success');
          } else if (cj.status === 'failed' || cj.status === 'interrupted') {
            clearInterval(composeTimerRef.current);
            setComposing(false);
            setComposeState((prev) => ({
              ...prev,
              stage: `合成失败：${cj.error || '未知错误'}`,
            }));
            pushToast(`合成失败：${cj.error || '未知错误'}`, 'error');
          } else {
            setComposeState((prev) => ({
              ...prev,
              done: cj.done || 0,
              total: cj.total || prev.total,
              stage: cj.stage || '合成处理中…',
            }));
          }
        } catch (err) {
          clearInterval(composeTimerRef.current);
          setComposing(false);
          setComposeState((prev) => ({ ...prev, stage: `查询进度失败：${err.message}` }));
        }
      };

      composeTimerRef.current = setInterval(pollCompose, 1200);
      pollCompose();
    } catch (e) {
      setComposing(false);
      setComposeState((prev) => ({ ...prev, stage: `提交失败：${e.message}` }));
      pushToast(`提交合成失败：${e.message}`, 'error');
    }
  };

  const readyCount = shots.filter((s) => Boolean(s.filename)).length;

  return (
    <div className="min-h-screen bg-[#090d14] text-slate-200">
      <TopBar
        mode={mode}
        onModeChange={(nextMode) => {
          setMode(nextMode);
          scheduleSave();
        }}
        health={health}
        gpuProgress={gpuProgress}
        onOpenHistory={() => setDrawerOpen(true)}
        historyCount={historyProjects.length + historyComps.length}
      />

      <main className="max-w-[1520px] mx-auto px-5 py-5 grid grid-cols-1 lg:grid-cols-[384px_minmax(0,1fr)] gap-5 items-start">
        <DnaSidebar
          title={title}
          onTitleChange={(v) => {
            setTitle(v);
            scheduleSave();
          }}
          saveState={saveState}
          selectedPresetId={selectedPresetId}
          onSelectPreset={(id) => applyPreset(id, { asNew: true })}
          onResetPreset={() => applyPreset(selectedPresetId, { asNew: false })}
          prefix={prefix}
          onPrefixChange={(v) => {
            setPrefix(v);
            scheduleSave();
          }}
          customChips={customChips}
          onAddCustomChip={(label, chipPrefix) => {
            const next = [...customChips, { label, prefix: chipPrefix }];
            setCustomChips(next);
            localStorage.setItem(CUSTOM_CHIPS_KEY, JSON.stringify(next));
            pushToast(`已保存风格胶囊「${label}」`, 'success');
          }}
          onRemoveCustomChip={(idx) => {
            const next = customChips.filter((_, i) => i !== idx);
            setCustomChips(next);
            localStorage.setItem(CUSTOM_CHIPS_KEY, JSON.stringify(next));
            pushToast('已移除自定义胶囊', 'info');
          }}
          aspectValue={aspectValue}
          onAspectChange={(v) => {
            setAspectValue(v);
            scheduleSave();
          }}
          seed={seed}
          onSeedChange={(v) => {
            setSeed(v);
            scheduleSave();
          }}
          onRandomSeed={() => {
            setSeed(randomSeed());
            scheduleSave();
          }}
          autoRandomize={autoRandomize}
          onAutoRandomizeChange={setAutoRandomize}
          negativePrompt={negativePrompt}
          onNegativeChange={(v) => {
            setNegativePrompt(v);
            scheduleSave();
          }}
          narrationStyle={narrationStyle}
          onNarrationStyleChange={setNarrationStyle}
          generatingNarration={generatingNarration}
          llmConfigured={Boolean(health?.llm_configured)}
          onGenerateNarration={handleGenerateNarration}
          ttsVoice={ttsVoice}
          onTtsVoiceChange={setTtsVoice}
          ttsVoices={health?.tts_voices}
          ttsConfigured={Boolean(health?.tts_configured)}
          ttsProvider={health?.tts_provider}
          generatingTts={generatingTts}
          onGenerateTtsAll={() => handleGenerateTts(null)}
          transitionType={transitionType}
          onTransitionTypeChange={setTransitionType}
          burnSubtitles={burnSubtitles}
          onBurnSubtitlesChange={setBurnSubtitles}
          autoAlignTts={autoAlignTts}
          onAutoAlignTtsChange={setAutoAlignTts}
          audioFiles={audioFiles}
          bgmFilename={bgmFilename}
          onBgmFilenameChange={setBgmFilename}
          bgmVolume={bgmVolume}
          onBgmVolumeChange={setBgmVolume}
          onUploadAudio={handleUploadAudio}
          onRunBatch={handleRunBatch}
          onCompose={handleCompose}
          batchDisabled={mode !== 'storyboard' || batchRunning || shots.length === 0}
          composeDisabled={mode !== 'storyboard' || readyCount === 0 || composing}
          batchRunning={batchRunning}
          composing={composing}
        />

        <section className="flex flex-col gap-3.5 min-w-0">
          {mode === 'video' ? (
            <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 text-[13px] text-amber-200">
                <Clapperboard className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>音画短片模式（MiniMax H3）</strong> 将在 Milestone 2 接入统一串行队列，当前请先使用「图文分镜模式」生图与运镜合成。
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('storyboard');
                  scheduleSave();
                }}
                className="rounded-lg border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 text-xs font-medium text-amber-100 cursor-pointer transition-colors"
              >
                切回图文分镜
              </button>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-800/90 bg-[#111827]/90 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 text-[13px] text-slate-400">
              <span>
                共 <strong className="text-slate-100 tabular-nums">{shots.length}</strong> 镜
              </span>
              <span className="text-slate-700">·</span>
              <span>
                已出图 <strong className="text-emerald-400 tabular-nums">{readyCount}</strong> 镜
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-xs text-slate-500">
                画幅 {aspect.width}×{aspect.height}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setShots((prev) => [...prev, buildShot('', prev.length)]);
                scheduleSave();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 hover:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>新增分镜</span>
            </button>
          </div>

          <ComposePanel
            state={composeState}
            onClose={() => setComposeState((prev) => ({ ...prev, visible: false }))}
          />

          <div className="flex flex-col gap-3">
            {shots.map((shot, idx) => (
              <ShotCard
                key={shot.uid}
                shot={shot}
                index={idx}
                total={shots.length}
                aspect={aspect}
                mode={mode}
                batchRunning={batchRunning}
                ttsBusy={generatingTts || ttsBusyUid === shot.uid}
                onChangePrompt={(val) => {
                  setShots((prev) =>
                    prev.map((s) => (s.uid === shot.uid ? { ...s, prompt: val } : s))
                  );
                  scheduleSave();
                }}
                onChangeNarration={(val) => {
                  setShots((prev) =>
                    prev.map((s) =>
                      s.uid === shot.uid
                        ? { ...s, narration: val, ttsFilename: '', ttsDuration: 0 }
                        : s
                    )
                  );
                  scheduleSave();
                }}
                onChangeMotion={(val) => {
                  setShots((prev) =>
                    prev.map((s) => (s.uid === shot.uid ? { ...s, motion: val } : s))
                  );
                  scheduleSave();
                }}
                onChangeDuration={(val) => {
                  setShots((prev) =>
                    prev.map((s) => (s.uid === shot.uid ? { ...s, duration: val } : s))
                  );
                  scheduleSave();
                }}
                onMoveUp={() => {
                  if (idx === 0) return;
                  setShots((prev) => {
                    const next = [...prev];
                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                    return next;
                  });
                  scheduleSave();
                }}
                onMoveDown={() => {
                  if (idx === shots.length - 1) return;
                  setShots((prev) => {
                    const next = [...prev];
                    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                    return next;
                  });
                  scheduleSave();
                }}
                onDuplicate={() => {
                  setShots((prev) => {
                    const clone = buildShot(shot.prompt, idx + 1, shot.narration || '');
                    const next = [...prev];
                    next.splice(idx + 1, 0, clone);
                    return next;
                  });
                  scheduleSave();
                }}
                onDelete={() => {
                  setShots((prev) => prev.filter((s) => s.uid !== shot.uid));
                  scheduleSave();
                }}
                onReroll={() => handleRerollShot(shot.uid)}
                onGenerateTts={() => handleGenerateTts(shot.uid)}
                onUploadImage={(file) => handleUploadShotImage(shot.uid, file)}
                onPreview={setLightboxSrc}
              />
            ))}
          </div>
        </section>
      </main>

      <HistoryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentProjectId={projectId}
        projects={historyProjects}
        compositions={historyComps}
        onRefresh={fetchLists}
        onOpenProject={async (pid) => {
          const r = await fetch(`/api/projects/${encodeURIComponent(pid)}`);
          const data = await r.json();
          if (r.ok && data.project) {
            applyProjectRecord(data.project);
            await restoreCompositionForProject(data.project.id);
            setDrawerOpen(false);
            pushToast(`已切换到项目：${data.project.title}`, 'info');
          }
        }}
        onDeleteProject={async (pid) => {
          const r = await fetch(`/api/projects/${encodeURIComponent(pid)}`, { method: 'DELETE' });
          if (r.ok) {
            if (pid === projectId) setProjectId(null);
            fetchLists();
            pushToast('已删除项目记录', 'info');
          }
        }}
        onCreateBlankProject={async () => {
          const blankShots = [buildShot('', 0), buildShot('', 1)];
          const nextState = {
            projectId: '',
            title: '新建分镜项目',
            mode: 'storyboard',
            prefix: '',
            negativePrompt,
            seed,
            aspectValue,
            shots: blankShots,
          };
          setProjectId(null);
          setTitle(nextState.title);
          setPrefix('');
          setShots(blankShots);
          setComposeState((prev) => ({ ...prev, visible: false, videoUrl: '' }));
          await saveProjectNow(nextState);
          fetchLists();
          setDrawerOpen(false);
          pushToast('已创建空白分镜项目', 'success');
        }}
        onPlayComposition={(c) => {
          setComposeState({
            visible: true,
            done: 1,
            total: 1,
            stage: `成片就绪 · ${c.width}×${c.height} · ${c.duration}s · 编码器 ${c.encoder || 'h264'}`,
            videoUrl: c.video_url,
            filename: c.filename,
            cacheBust: Date.now(),
          });
          setDrawerOpen(false);
        }}
        onDeleteComposition={async (cid) => {
          const r = await fetch(`/api/compositions/${encodeURIComponent(cid)}`, { method: 'DELETE' });
          if (r.ok) {
            fetchLists();
            pushToast('已删除成片及磁盘文件', 'info');
          }
        }}
      />

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc('')} />
    </div>
  );
}
