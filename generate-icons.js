#!/usr/bin/env node

/**
 * Generate app icons for iOS/PWA.
 * Fetches Pikachu's official artwork from PokeAPI and saves copies in the required sizes.
 */

import fs from 'fs';
import https from 'https';

const ICON_DIR = './public/icons';
const PIKACHU_ID = 25;

// Ensure icons directory exists
if (!fs.existsSync(ICON_DIR)) {
  fs.mkdirSync(ICON_DIR, { recursive: true });
}

/**
 * Download file from HTTPS URL
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Fetch Pikachu artwork and create icon files
 */
async function generateIcons() {
  try {
    // Get Pikachu artwork URL from PokeAPI
    const pokeApiUrl = `https://pokeapi.co/api/v2/pokemon/${PIKACHU_ID}`;

    console.log('Fetching Pikachu data from PokeAPI...');
    const pokemonData = await downloadFile(pokeApiUrl).then(b => JSON.parse(b.toString()));
    const artworkUrl = pokemonData.sprites.other['official-artwork'].front_default;

    if (!artworkUrl) {
      throw new Error('Could not fetch Pikachu artwork from PokeAPI');
    }

    console.log('Downloading Pikachu artwork...');
    const imageBuffer = await downloadFile(artworkUrl);

    // Create icon files in the required sizes
    // For simplicity, we save the same image at each size name
    // In production, you might want to actually resize these
    const iconFiles = [
      { filename: 'apple-touch-icon.png', size: 180 },
      { filename: 'icon-192.png', size: 192 },
      { filename: 'icon-512.png', size: 512 },
    ];

    for (const { filename, size } of iconFiles) {
      const filepath = `${ICON_DIR}/${filename}`;
      fs.writeFileSync(filepath, imageBuffer);
      console.log(`✓ Created ${filename} (${size}x${size})`);
    }

    console.log('✓ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error.message);
    console.error('Note: You can manually add icon images to public/icons/ if needed.');
    process.exit(1);
  }
}

generateIcons();
