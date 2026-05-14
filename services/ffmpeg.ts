import ffmpegPath from 'ffmpeg-static';

/**
 * Helper that returns the absolute path to the bundled FFmpeg binary.
 * Use this when invoking FFmpeg (e.g., via child_process, fluent-ffmpeg, or
 * another orchestrator) to grab the precise frame listed in the Perplexity dataset.
 */
export const getFfmpegPath = (): string => {
  if (!ffmpegPath) {
    throw new Error('FFmpeg binary not found. Ensure ffmpeg-static is installed.');
  }
  return ffmpegPath;
};

/**
 * Example command builder for capturing a single frame at a timestamp.
 *
 * This only returns the command array; pass it to child_process.spawn or
 * use a wrapper library to execute it. Example usage:
 *   const args = buildFrameCaptureArgs(url, '00:12:47', 'output.png');
 *   spawn(getFfmpegPath(), args, { stdio: 'inherit' });
 */
export const buildFrameCaptureArgs = (inputUrl: string, timestamp: string, outputPath: string): string[] => {
  return [
    '-y',
    '-ss', timestamp,
    '-i', inputUrl,
    '-frames:v', '1',
    '-q:v', '2',
    outputPath,
  ];
};
