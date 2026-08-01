export const applyWhiteBalance = ( pixels: Uint8ClampedArray ): void => {
    const totalPixels = pixels.length / 4;

    let totalR = 0, totalG = 0, totalB = 0;

    // Step 1: Calculate the sum of all RGB values
    for ( let i = 0, len = pixels.length; i < len; i += 4) {
        totalR += pixels[ i ];
        totalG += pixels[ i + 1 ];
        totalB += pixels[ i + 2 ];
    }

    // Step 2: Find the average value for each channel
    const avgR = totalR / totalPixels;
    const avgG = totalG / totalPixels;
    const avgB = totalB / totalPixels;

    // Step 3: Calculate the overall average brightness
    const avgGray = ( avgR + avgG + avgB ) / 3;

    // Step 4: Calculate scaling factors for each channel
    const scaleR = avgGray / avgR;
    const scaleG = avgGray / avgG;
    const scaleB = avgGray / avgB;

    // Step 5: Apply the scaling factors to every pixel
    for ( let i = 0, len = pixels.length; i < len; i += 4 ) {
        pixels[i]     = Math.min(255, pixels[i] * scaleR);     // New Red
        pixels[i + 1] = Math.min(255, pixels[i + 1] * scaleG); // New Green
        pixels[i + 2] = Math.min(255, pixels[i + 2] * scaleB); // New Blue
        // data[i+3] is Alpha (transparency), leave it unchanged
    }
};
