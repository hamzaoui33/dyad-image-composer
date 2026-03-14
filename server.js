const express = require('express');
const sharp = require('sharp');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

// Add middleware to capture raw body for debugging
app.use((req, res, next) => {
  console.log('=== REQUEST RECEIVED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  next();
});

// Add a simple test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

app.post('/compose', async (req, res) => {
  try {
    console.log('=== COMPOSE ENDPOINT CALLED ===');
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    console.log('Request body type:', typeof req.body);
    console.log('Request body keys:', Object.keys(req.body || {}));
    
    // Extract parameters from the request
    const params = extractParams(req.body);
    console.log('Extracted parameters:', params);
    
    // Validate required parameters
    if (!params.backgroundUrl || !params.overlayUrl) {
      const errorMsg = 'backgroundUrl and overlayUrl are required';
      console.error('Validation error:', errorMsg);
      return res.status(400).json({ error: errorMsg, received: params });
    }
    
    // Convert overlayWidth to number if provided
    let width;
    if (params.overlayWidth) {
      width = Number(params.overlayWidth);
      if (isNaN(width)) {
        return res.status(400).json({ error: 'overlayWidth must be a valid number' });
      }
      console.log('Overlay width:', width);
    }
    
    // Convert blurBackground to boolean if provided
    const blur = params.blurBackground !== undefined ? 
      String(params.blurBackground).toLowerCase() === 'true' : false;
    console.log('Blur background:', blur);
    
    // Fetch background image
    console.log('Fetching background image from:', params.backgroundUrl);
    let backgroundResponse;
    try {
      backgroundResponse = await axios.get(params.backgroundUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        }
      });
      console.log('Background image fetched, status:', backgroundResponse.status, 'size:', backgroundResponse.data.length);
    } catch (fetchError) {
      console.error('Background fetch error:', fetchError.message);
      if (fetchError.response) {
        console.error('Background response status:', fetchError.response.status);
        console.error('Background response headers:', fetchError.response.headers);
      }
      return res.status(400).json({ 
        error: 'Failed to fetch background image',
        details: fetchError.message,
        url: params.backgroundUrl
      });
    }
    
    const backgroundBuffer = backgroundResponse.data;
    
    // Fetch overlay image
    console.log('Fetching overlay image from:', params.overlayUrl);
    let overlayResponse;
    try {
      overlayResponse = await axios.get(params.overlayUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        }
      });
      console.log('Overlay image fetched, status:', overlayResponse.status, 'size:', overlayResponse.data.length);
    } catch (fetchError) {
      console.error('Overlay fetch error:', fetchError.message);
      if (fetchError.response) {
        console.error('Overlay response status:', fetchError.response.status);
      }
      return res.status(400).json({ 
        error: 'Failed to fetch overlay image',
        details: fetchError.message,
        url: params.overlayUrl
      });
    }
    
    const overlayBuffer = overlayResponse.data;
    
    // Process background image
    console.log('Processing background image with sharp...');
    let background;
    try {
      background = sharp(backgroundBuffer);
      if (blur) {
        background = background.blur(10);
      }
      // Get background metadata
      const bgMetadata = await background.metadata();
      console.log('Background metadata:', bgMetadata);
    } catch (sharpError) {
      console.error('Sharp background error:', sharpError.message);
      return res.status(400).json({ error: 'Failed to process background image' });
    }
    
    // Process overlay image
    console.log('Processing overlay image with sharp...');
    let overlay;
    try {
      overlay = sharp(overlayBuffer);
      if (width) {
        const metadata = await overlay.metadata();
        console.log('Overlay metadata:', metadata);
        if (!metadata.width || !metadata.height) {
          throw new Error('Invalid image dimensions');
        }
        const height = Math.round((metadata.height * width) / metadata.width);
        console.log('Resizing overlay to:', width, 'x', height);
        overlay = overlay.resize(width, height);
      }
    } catch (sharpError) {
      console.error('Sharp overlay error:', sharpError.message);
      return res.status(400).json({ error: 'Failed to process overlay image' });
    }
    
    // Composite images
    console.log('Compositing images...');
    let composite;
    try {
      composite = background.composite([
        {
          input: await overlay.toBuffer(),
          blend: 'over',
          top: 'center',
          left: 'center',
        }
      ]);
    } catch (compositeError) {
      console.error('Composite error:', compositeError.message);
      return res.status(400).json({ error: 'Failed to composite images' });
    }
    
    // Output result
    console.log('Generating output buffer...');
    try {
      const png = await composite.toBuffer({ resolveWithObject: true });
      console.log('Image generated successfully, size:', png.data.length);
      res.set('Content-Type', 'image/png');
      res.send(png.data);
    } catch (outputError) {
      console.error('Output error:', outputError.message);
      return res.status(500).json({ error: 'Failed to generate output image' });
    }
    
  } catch (error) {
    console.error('=== UNHANDLED COMPOSITION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    
    // Send detailed error in development
    if (process.env.NODE_ENV !== 'production') {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        name: error.name,
        stack: error.stack 
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Helper function to extract parameters from various request formats
function extractParams(body) {
  console.log('extractParams called with:', body);
  
  // If body is null or undefined
  if (!body) {
    console.log('Body is null/undefined');
    return {};
  }
  
  // Format 1: Direct parameters at root level
  if (body.backgroundUrl || body.overlayUrl) {
    console.log('Detected format 1: direct parameters');
    return {
      backgroundUrl: body.backgroundUrl,
      overlayUrl: body.overlayUrl,
      overlayWidth: body.overlayWidth,
      blurBackground: body.blurBackground
    };
  }
  
  // Format 2: Parameters nested in body property (n8n style)
  if (body.body && typeof body.body === 'object') {
    console.log('Detected format 2: nested body property');
    return {
      backgroundUrl: body.body.backgroundUrl,
      overlayUrl: body.body.overlayUrl,
      overlayWidth: body.body.overlayWidth,
      blurBackground: body.body.blurBackground
    };
  }
  
  // Format 3: n8n parameters array
  if (body.parameters && Array.isArray(body.parameters)) {
    console.log('Detected format 3: parameters array');
    const params = {};
    body.parameters.forEach(param => {
      if (param.name && param.value !== undefined) {
        params[param.name] = param.value;
      }
    });
    return params;
  }
  
  console.log('No known format detected');
  return {};
}

// Export for Vercel serverless functions
module.exports = app;