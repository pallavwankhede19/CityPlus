'use strict';

/**
 * polyline.js — Google polyline encoder / decoder
 *
 * Implements the standard Google Maps Encoded Polyline Algorithm.
 * Zero external dependencies — keeps the service portable.
 *
 * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

/**
 * Decode a Google polyline string into an array of {lat, lng} objects.
 * @param  {string}   encoded  Encoded polyline string
 * @returns {{ lat: number, lng: number }[]}
 */
function decode(encoded) {
  const coords = [];
  let index = 0;
  let lat   = 0;
  let lng   = 0;

  while (index < encoded.length) {
    let b, shift, result;

    // Decode latitude
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift  += 5;
    } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    // Decode longitude
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift  += 5;
    } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coords;
}

/**
 * Convert decoded coordinates to a PostGIS-compatible WKT LineString.
 * PostGIS uses (longitude latitude) order inside WKT.
 * @param  {{ lat: number, lng: number }[]} coords
 * @returns {string}  e.g. "LINESTRING(73.85 18.52, 73.86 18.53)"
 */
function coordsToWKT(coords) {
  if (!coords || coords.length < 2) {
    throw new Error('At least 2 coordinates required to form a LineString.');
  }
  const points = coords.map(c => `${c.lng} ${c.lat}`).join(', ');
  return `LINESTRING(${points})`;
}

module.exports = { decode, coordsToWKT };
