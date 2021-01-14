/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
#include <math.h>

float MAX_8BIT = 255.f;
float HALF     = 0.5;

// internal filter methods

inline void desaturate( float& r, float& g, float& b ) {
    float grayScale = r * 0.3 + g * 0.59 + b * 0.11;
    r = grayScale;
    g = grayScale;
    b = grayScale;
}

inline void gamma( float gamma, float& r, float& g, float& b ) {
    r = r * gamma * gamma;
    g = g * gamma * gamma;
    b = b * gamma * gamma;
}

// used for brightness, but is in essence a multiplication for the pixel values

inline void multiply( float factor, float& r, float& g, float& b ) {
    r *= factor;
    g *= factor;
    b *= factor;
}

inline void contrast( float contrast, float& r, float& g, float& b ) {
    r = (( r / MAX_8BIT - HALF ) * contrast + HALF ) * MAX_8BIT;
    g = (( g / MAX_8BIT - HALF ) * contrast + HALF ) * MAX_8BIT;
    b = (( b / MAX_8BIT - HALF ) * contrast + HALF ) * MAX_8BIT;
}

inline void vibrance( float vibrance, float& r, float& g, float& b ) {
    float max, avg, amt;

    if ( r > g && r > b ) {
        max = r;
    } else if ( g > r && g > b ) {
        max = g;
    } else if ( b > r && b > g ) {
        max = b;
    }

    avg = ( r + g + b ) / 3;
    amt = (( abs( max - avg ) * 2 / MAX_8BIT ) * vibrance ) / 10; // 100;

    if ( r != max ) {
        r = r + ( max - r ) * amt;
    }
    if ( g != max ) {
        g = g + ( max - g ) * amt;
    }
    if ( b != max ) {
        b = b + ( max - b ) * amt;
    }
}

extern "C" {
    void filter( float* pixels, int length, float vGamma, float vBrightness, float vContrast, float vVibrance, bool doGamma, bool doDesaturate, bool doBrightness, bool doContrast, bool doVibrance ) {
        float r, g, b, a;
        for ( size_t i = 0; i < length; i += 4 ) {
            r = pixels[ i ];
            g = pixels[ i + 1 ];
            b = pixels[ i + 2 ];

            if ( doGamma )
                gamma( vGamma, r, g, b );

            if ( doDesaturate )
                desaturate( r, g, b );

            if ( doBrightness )
                multiply( vBrightness, r, g, b );

            if ( doContrast )
                contrast( vContrast, r, g, b );

            if ( doVibrance )
                vibrance( vVibrance, r, g, b );

            pixels[ i ]     = r;
            pixels[ i + 1 ] = g;
            pixels[ i + 2 ] = b;
        }
    }
}
