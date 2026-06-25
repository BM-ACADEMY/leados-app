const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

const videoPath = path.join(__dirname, '../server/uploads/transcoded_1f7UhQ4gKqWgHdYA_A7WPzo3inGbUsz0k.mp4');
const outputPath = path.join(__dirname, '../server/uploads/test_thumb.jpg');

function generateThumbnail(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(1)
      .frames(1)
      .output(outputPath)
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

generateThumbnail(videoPath, outputPath)
  .then(() => console.log("SUCCESS: Thumbnail generated successfully!"))
  .catch((err) => console.error("ERROR: Thumbnail generation failed:", err));
