# Image Composer API

A powerful image composition API that allows you to overlay images on top of background images with various options like resizing, blurring, and positioning.

## Features

- **Image Overlay**: Place overlay images on top of background images
- **Background Blur**: Apply blur effect to the background image
- **Overlay Resizing**: Resize overlay images to specific widths
- **Center Positioning**: Automatically center the overlay image
- **Multiple Formats**: Supports various image formats (PNG, JPEG, WebP, etc.)
- **High Performance**: Built with Sharp for fast image processing

## API Endpoints

### POST /compose

The main endpoint for image composition.

#### Request Body

The API accepts form data with the following parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `backgroundUrl` | string | Yes | URL of the background image |
| `overlayUrl` | string | Yes | URL of the overlay image |
| `overlayWidth` | string | No | Desired width of the overlay image (in pixels) |
| `blurBackground` | string | No | Whether to blur the background (`true` or `false`) |

#### Example Request

```json
{
  "backgroundUrl": "https://example.com/background.jpg",
  "overlayUrl": "https://example.com/overlay.png",
  "overlayWidth": "300",
  "blurBackground": "true"
}
```

#### Example cURL Request

```bash
curl -X POST https://your-domain.com/compose \
  -H "Content-Type: application/json" \
  -d '{
    "backgroundUrl": "https://example.com/background.jpg",
    "overlayUrl": "https://example.com/overlay.png",
    "overlayWidth": "300",
    "blurBackground": "true"
  }'
```

#### Example n8n Request

When using n8n HTTP Request node:
- Set URL to: `https://your-domain.com/compose`
- Method: POST
- Body: JSON
- Add the parameters as JSON object

#### Response

- **Success**: Returns the composed image as PNG (Content-Type: `image/png`)
- **Error**: Returns JSON with error details

#### Error Responses

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | Bad Request | Missing required parameters or invalid image processing |
| 500 | Internal Server Error | Server error during image processing |

#### Common Error Messages

- `"backgroundUrl and overlayUrl are required"`: Missing required parameters
- `"Failed to fetch background image"`: Could not download background image
- `"Failed to fetch overlay image"`: Could not download overlay image
- `"Failed to process background image"`: Error processing background image
- `"Failed to process overlay image"`: Error processing overlay image
- `"Failed to composite images"`: Error combining images
- `"Failed to generate output image"`: Error generating final image

### GET /test

A simple test endpoint to verify the server is running.

#### Response

```json
{
  "message": "Server is working"
}
```

## Usage Examples

### Basic Image Overlay

```bash
curl -X POST https://your-domain.com/compose \
  -H "Content-Type: application/json" \
  -d '{
    "backgroundUrl": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200",
    "overlayUrl": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png"
  }'
```

### With Overlay Resizing

```bash
curl -X POST https://your-domain.com/compose \
  -H "Content-Type: application/json" \
  -d '{
    "backgroundUrl": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200",
    "overlayUrl": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
    "overlayWidth": "300"
  }'
```

### With Background Blur

```bash
curl -X POST https://your-domain.com/compose \
  -H "Content-Type: application/json" \
  -d '{
    "backgroundUrl": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200",
    "overlayUrl": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
    "blurBackground": "true"
  }'
```

### Complete Example

```bash
curl -X POST https://your-domain.com/compose \
  -H "Content-Type: application/json" \
  -d '{
    "backgroundUrl": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200",
    "overlayUrl": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
    "overlayWidth": "300",
    "blurBackground": "true"
  }'
```

## n8n Integration

### Step-by-Step Setup

1. **Add HTTP Request Node**
   - Set URL to: `https://your-domain.com/compose`
   - Method: POST
   - Body: JSON

2. **Configure Parameters**
   - Add parameters as JSON object:
   ```json
   {
     "backgroundUrl": "https://example.com/background.jpg",
     "overlayUrl": "https://example.com/overlay.png",
     "overlayWidth": "300",
     "blurBackground": "true"
   }
   ```

3. **Handle Response**
   - The response will be the composed image (PNG format)
   - Use Binary Data type for the response

### Troubleshooting n8n Issues

If you get "Bad request - please check your parameters":
- Ensure all required parameters are provided
- Check that URLs are valid and accessible
- Verify the response is set to Binary Data type
- Check the Vercel logs for detailed error messages

## Technical Details

### Dependencies

- **Express**: Web framework for Node.js
- **Sharp**: High-performance image processing library
- **Axios**: HTTP client for fetching images
- **CORS**: Cross-Origin Resource Sharing middleware

### Image Processing

The API uses Sharp for image processing, which supports:
- Multiple image formats (JPEG, PNG, WebP, GIF, TIFF, SVG)
- High-performance operations
- Memory-efficient processing
- Automatic format conversion

### Error Handling

The API provides detailed error messages to help diagnose issues:
- Network errors (failed to fetch images)
- Processing errors (invalid image formats)
- Composition errors (image incompatibility)
- Server errors (unexpected issues)

## Deployment

This API is designed to run on Vercel serverless functions. The deployment includes:

- Automatic scaling
- Global CDN
- SSL/TLS encryption
- Request/response logging
- Error monitoring

## Rate Limiting

Currently, there are no rate limits implemented. However, please:
- Use the API responsibly
- Implement client-side caching
- Handle errors gracefully
- Monitor usage patterns

## Support

For issues and support:
1. Check the Vercel logs for detailed error messages
2. Verify all URLs are accessible
3. Ensure image formats are supported
4. Check network connectivity

## License

This project is open source and available under the MIT License.