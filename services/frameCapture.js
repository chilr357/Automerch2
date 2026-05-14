import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import ytdl from 'ytdl-core';

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);

const normalizeTimestamp = (value) => {
  if (!value) return '00:00:00';
  const parts = value.toString().trim().split(':');
  if (parts.length === 1) {
    const seconds = Number(parts[0]) || 0;
    return new Date(seconds * 1000).toISOString().substring(11, 19);
  }
  if (parts.length === 2) {
    return `00:${parts.map(p => p.padStart(2, '0')).join(':')}`;
  }
  if (parts.length === 3) {
    return parts.map(p => p.padStart(2, '0')).join(':');
  }
  return '00:00:00';
};

const runFfmpeg = (args, inputStream) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const outChunks = [];
    const errChunks = [];

    ffmpeg.stdout.on('data', (chunk) => outChunks.push(chunk));
    ffmpeg.stderr.on('data', (chunk) => errChunks.push(chunk));

    ffmpeg.on('error', (error) => reject(error));
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(outChunks));
      } else {
        reject(new Error(`ffmpeg exited with ${code}: ${Buffer.concat(errChunks).toString()}`));
      }
    });

    if (inputStream) {
      inputStream.pipe(ffmpeg.stdin);
      inputStream.on('error', (err) => ffmpeg.stdin.destroy(err));
    } else {
      ffmpeg.stdin.end();
    }
  });
};

export const captureFrame = async (videoUrl, timestamp) => {
  if (!ffmpegPath) throw new Error('FFmpeg binary not available');
  const normTimestamp = normalizeTimestamp(timestamp);
  let buffer;
  const url = new URL(videoUrl);
  if (YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
    const ytStream = ytdl(videoUrl, { quality: 'highestvideo' });
    buffer = await runFfmpeg(['-loglevel', 'error', '-i', 'pipe:0', '-ss', normTimestamp, '-frames:v', '1', '-f', 'image2pipe', 'pipe:1'], ytStream);
  } else {
    buffer = await runFfmpeg(['-loglevel', 'error', '-ss', normTimestamp, '-i', videoUrl, '-frames:v', '1', '-f', 'image2pipe', 'pipe:1']);
  }
  if (!buffer || buffer.length === 0) {
    throw new Error('Unable to capture frame');
  }
  const base64 = buffer.toString('base64');
  return `data:image/png;base64,${base64}`;
};
