const express = require('express');
const sharp = require('sharp');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Add a simple test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

app.post('/compose', async (req, res) => {
  try {
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    
    // Extract parameters from the request format
    const { backgroundUrl, overlayUrl, overlayWidth, blurBackground } = extractParams(req.body);
        console.log('Extracted parameters:', { backgroundUrl, overlayUrl, overlayWidth, blurBackground });
    
    // Validate required parameters
    if (!backgroundUrl || !overlayUrl) {
      return res.status(400).json({ error: 'backgroundUrl and overlayUrl are required' });
    }
    
    // Convert overlayWidth to number if provided
    const width = overlayWidth ? Number(overlayWidth) : undefined;
    if (overlayWidth && isNaN(width)) {
      return res.status(400).json({ error: 'overlayWidth must be a valid number' });
    }
    
    // Convert blurBackground to boolean if provided
    const blur = blurBackground !== undefined ? Boolean(blurBackground) : false;
        // Fetch background image    let backgroundResponse;
    try {
      backgroundResponse = await axios.get(backgroundUrl, { 
        responseType: 'arraybuffer',
        timeout: 10000 // 10 second timeout for image fetch
      });
    } catch (fetchError) {
      console.error('Background image fetch error:', fetchError.message);
      return res.status(400).json({ error: 'Failed to fetch background image' });
    }
    
    const backgroundBuffer = backgroundResponse.data;
    
    // Fetch overlay image    let overlayResponse;
    try {
      overlayResponse = await axios.get(overlayUrl, { 
        responseType: 'arraybuffer',
        timeout: 10000 // 10 second timeout for image fetch
      });
    } catch (fetchError) {
      console.error('Overlay image fetch error:', fetchError.message);
      return res.status(400).json({ error: 'Failed to fetch overlay image' });
    }
        const overlayBuffer = overlayResponse.data;
    
    // Process background image
    let background = sharp(backgroundBuffer);
    if (blur) {
      background = background.blur(10);
    }
    
    // Process overlay image
    let overlay = sharp(overlayBuffer);
    if (width) {
      try {
        // Get metadata to maintain aspect ratio
        const metadata = await overlay.metadata();
        if (!metadata.width || !metadata.height) {
          throw new Error('Invalid image dimensions');
        }
        const height = Math.round((metadata.height * width) / metadata.width);
        overlay = overlay.resize(width, height);
      } catch (resizeError) {
        console.error('Overlay resize error:', resizeError.message);
        return res.status(400).json({ error: 'Failed to process overlay image' });
      }
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
    
    // Output result    const png = await composite.toBuffer({ resolveWithObject: true });
    res.set('Content-Type', 'image/png');
    res.send(png.data);
    
  } catch (error) {
    console.error('Composition error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to extract parameters from n8n-style request
function extractParams(body) {
  const params = {};
  
  if (body.parameters) {
    body.parameters.forEach(param => {
      params[param.name] = param.value;
    });
  }
  
  return {
    backgroundUrl: body.backgroundUrl || params.backgroundUrl,
    overlayUrl: body.overlayUrl || params.overlayUrl,
    overlayWidth: body.overlayWidth || params.overlayWidth,
    blurBackground: body.blurBackground || params.blurBackground
  };
}

// Export for Vercel serverless functions
module.exports = app;