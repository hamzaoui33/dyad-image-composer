const express = require('express');
const sharp = require('sharp');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

app.post('/compose', async (req, res) => {
  try {
    const { backgroundUrl, overlayUrl, overlayWidth, blurBackground } = req.body;
    
    // Fetch background image
    const backgroundResponse = await axios.get(backgroundUrl, { responseType: 'arraybuffer' });
    const backgroundBuffer = backgroundResponse.data;
    
    // Fetch overlay image
    const overlayResponse = await axios.get(overlayUrl, { responseType: 'arraybuffer' });
    const overlayBuffer = overlayResponse.data;
    
    // Process background image
    let background = sharp(backgroundBuffer);
    if (blurBackground) {
      background = background.blur(10);
    }
    
    // Process overlay image
    let overlay = sharp(overlayBuffer);
    if (overlayWidth) {
      overlay = overlay.resize(overlayWidth, sharp().unknown());
    }
    
    // Composite images
    const composite = background.composite([
      {
        input: overlay,
        blend: 'over',
        top: 'center',
        left: 'center',
      }
    ]);
    
    // Output result
    const png = await composite.toBuffer({ resolveWithObject: true });
    res.set('Content-Type', 'image/png');
    res.send(png.data);
    
  } catch (error) {
    console.error('Composition error:', error);
    res.status(400).json({ error: 'Invalid image processing request' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});