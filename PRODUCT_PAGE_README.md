# MCP Studio Product Page

A beautiful, modern, and interactive product landing page for MCP Studio - your Model Context Protocol Command Center.

## Features

- **Modern Design**: Clean, professional SaaS-style interface with beautiful gradients and animations
- **Responsive Layout**: Optimized for all devices and screen sizes
- **Interactive Elements**: Smooth scrolling, hover effects, and animated counters
- **Comprehensive Information**: Complete overview of MCP Studio features and capabilities
- **Download Section**: Ready-to-use download buttons for macOS and Windows (placeholders for now)
- **FAQ Section**: Answers to common questions about MCP Studio
- **Tech Stack Showcase**: Visual representation of the technologies used
- **Mobile-Friendly**: Fully responsive design with mobile navigation

## Preview

The product page includes:

1. **Hero Section**: Eye-catching introduction with key value propositions
2. **Features Section**: Detailed breakdown of core functionality
3. **How It Works**: Step-by-step process explanation
4. **Tech Stack**: Visual showcase of technologies used
5. **Screenshots**: Placeholder images for app interfaces
6. **Download Section**: Platform-specific download buttons
7. **FAQ**: Common questions and answers
8. **Footer**: Links and additional information

## Running the Product Page

### Option 1: Using the Express Server

```bash
# Install dependencies if not already installed
npm install

# Start the product page server
npm run serve:product-page
```

The page will be available at `http://localhost:8080`

### Option 2: Direct File Access

You can also open the `public/index.html` file directly in your browser, though some features may work better when served through a web server.

## Customization

### Updating Content

Edit the `public/index.html` file to update:
- Product descriptions
- Feature lists
- Screenshots
- Download links
- FAQ content
- Contact information

### Styling

The page uses:
- **Tailwind CSS** for styling (loaded via CDN)
- **Custom CSS** for animations and gradients
- **Google Fonts** (Inter font family)
- **Responsive design** principles

### Adding Real Download Links

When you're ready to add actual download links:

1. Build your application packages:
   ```bash
   npm run dist:mac    # For macOS
   npm run dist:win    # For Windows
   ```

2. Replace the placeholder buttons in the download section with actual download links:
   ```html
   <!-- Replace the disabled buttons with actual download links -->
   <a href="/downloads/mcp-studio-mac.dmg" class="download-button ...">
       Download for Mac
   </a>
   ```

### Screenshots

Replace the placeholder images with actual screenshots:
1. Take screenshots of your application
2. Upload them to your preferred image hosting service
3. Update the `src` attributes in the screenshots section

## Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with animations
- **JavaScript**: Interactive functionality
- **Tailwind CSS**: Utility-first CSS framework
- **Google Fonts**: Typography (Inter)
- **Express.js**: Static file server (optional)

## Deployment

### Static Hosting (Recommended)

Deploy the `public/` folder to any static hosting service:
- **Netlify**: Drag and drop deployment
- **Vercel**: Git-based deployment
- **GitHub Pages**: Direct from repository
- **AWS S3**: Static website hosting

### Express Server Deployment

Deploy the entire project with the Express server:
- **Heroku**: `git push heroku main`
- **Digital Ocean**: App platform
- **AWS**: Elastic Beanstalk
- **Google Cloud**: App Engine

## File Structure

```
public/
├── index.html          # Main product page
├── favicon.svg         # Site icon
├── favicon.png         # Fallback icon
└── oauth-callback.html # OAuth callback (existing)

product-page-server.js  # Express server for development
```

## License

This product page is part of the MCP Studio project and follows the same MIT License.

## Support

For issues or questions about the product page:
- Open an issue in the main repository
- Contact the development team
- Check the main MCP Studio documentation

---

Made with ❤️ for the MCP Studio project
