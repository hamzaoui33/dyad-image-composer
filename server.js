const express = require('express');
const sharp = require('sharp');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

// Add a simple test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

app.post('/compose', async (req, res) => {
  try {
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    
    // Extract parameters - handle multiple formats
    let params = {};
    
    // Format 1: { "body": { "backgroundUrl": "...", ... } }
    if (req.body.body && typeof req.body.body === 'object') {
      params = req.body.body;
    }
    // Format 2: Direct JSON { "backgroundUrl": "...", ... }
    else if (req.body.backgroundUrl || req.body.overlayUrl) {
      params = req.body;
    }
    // Format 3: n8n form-style with parameters array
    else if (req.body.parameters && Array.isArray(req.body.parameters)) {
      req.body.parameters.forEach(param => {
        params[param.name] = param.value;
      });
    }
    
    console.log('Extracted parameters:', params);
    
    // Validate required parameters
    if (!params.backgroundUrl || !params.overlayUrl) {
      return res.status(400).json({ 
        error: 'backgroundUrl and overlayUrl are required',
        received: params 
      });
    }
    
    // Convert overlayWidth to number if provided
    const width = params.overlayWidth ? Number(params.overlayWidth) : undefined;
    if (params.overlayWidth && isNaN(width)) {
      return res.status(400).json({ error: 'overlayWidth must be a valid number' });
    }
    
    // Convert blurBackground to boolean if provided
    const blur = params.blurBackground !== undefined ? 
      String(params.blurBackground).toLowerCase() === 'true' : false;
    
    console.log('Processing with:', { width, blur });
    
    // Fetch background image
    let backgroundResponse;
    try {
      backgroundResponse = await axios.get(params.backgroundUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000 // 30 second timeout
      });
    } catch (fetchError) {
      console.error('Background fetch error:', fetchError.message);
      return res.status(400).json({ 
        error: 'Failed to fetch background image',
        details: fetchError.message 
      });
    }
    
    const backgroundBuffer = backgroundResponse.data;
    
    // Fetch overlay image
    let overlayResponse;
    try {
      overlayResponse = await axios.get(params.overlayUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000 // 30 second timeout
      });
    } catch (fetchError) {
      console.error('Overlay fetch error:', fetchError.message);
      return res.status(400).json({ 
        error: 'Failed to fetch overlay image',
        details: fetchError.message 
      });
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
    
    // Output result
    const png = await composite.toBuffer({ resolveWithObject: true });
    res.set('Content-Type', 'image/png');
    res.send(png.data);
    
  } catch (error) {
    console.error('Composition error:', error);
    console.error('Error stack:', error.stack);
    
    // Send detailed error in development
    if (process.env.NODE_ENV !== 'production') {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        stack: error.stack 
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Export for Vercel serverless functions
module.exports = app;