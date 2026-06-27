/*
 * StargazingAstro frozen public API.
 * Public shape: julianDate(date), gmstHours(jd), lstHours(jd, lonDeg),
 * equatorialToHorizontal({raHours, decDeg}, {latDeg, lonDeg}, jd),
 * sunPosition(jd), moonPosition(jd), planetPosition(name, jd).
 *
 * Boundary contract: every public input and output uses degrees and hours.
 * All internal trigonometry runs in radians; deg<->rad/hour helpers convert at
 * the edges. Pure functions only: no DOM access and no globals beyond the
 * dual-export shim at the bottom of this file.
 *
 * Accuracy target is naked-eye / visual, not ephemeris-grade. Formulae follow
 * Jean Meeus, "Astronomical Algorithms" (2nd ed.):
 *   - Julian Date            ch. 7
 *   - Sidereal time          ch. 12 (eq. 12.4)
 *   - Coordinate transform   ch. 13 (eq. 13.5, 13.6)
 *   - Solar position         ch. 25 (low precision)
 *   - Lunar position         ch. 47 (truncated periodic terms)
 *   - Illuminated fraction   ch. 48
 * Planetary positions use the Standish low-precision Keplerian elements
 * (E. M. Standish, JPL, valid 1800-2050) reduced to geocentric RA/dec.
 */
(function () {
  "use strict";

  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;
  const J2000_JD = 2451545.0;
  const UNIX_EPOCH_JD = 2440587.5;
  const MS_PER_DAY = 86400000;

  function deg2rad(deg) {
    return deg * DEG2RAD;
  }

  function rad2deg(rad) {
    return rad * RAD2DEG;
  }

  function normalizeDeg(deg) {
    const wrapped = deg % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
  }

  function normalizeHours(hours) {
    const wrapped = hours % 24;
    return wrapped < 0 ? wrapped + 24 : wrapped;
  }

  function centuriesSinceJ2000(jd) {
    return (jd - J2000_JD) / 36525.0;
  }

  // Meeus ch. 7: JD from a UTC instant via the Unix epoch anchor.
  function julianDate(date) {
    return date.getTime() / MS_PER_DAY + UNIX_EPOCH_JD;
  }

  // Meeus eq. 12.4: Greenwich Mean Sidereal Time in degrees, then hours.
  function gmstHours(jd) {
    const t = centuriesSinceJ2000(jd);
    const gmstDeg =
      280.46061837 +
      360.98564736629 * (jd - J2000_JD) +
      0.000387933 * t * t -
      (t * t * t) / 38710000.0;
    return normalizeHours(normalizeDeg(gmstDeg) / 15);
  }

  // Local sidereal time: east longitude adds 1 hour per 15 degrees.
  function lstHours(jd, lonDeg) {
    return normalizeHours(gmstHours(jd) + lonDeg / 15);
  }

  // Meeus eq. 13.5/13.6. Hour angle H = LST - RA; azimuth is measured from
  // North through East into [0, 360).
  function equatorialToHorizontal(equatorial, observer, jd) {
    const lst = lstHours(jd, observer.lonDeg);
    const hourAngleDeg = normalizeDeg((lst - equatorial.raHours) * 15);
    const h = deg2rad(hourAngleDeg);
    const dec = deg2rad(equatorial.decDeg);
    const lat = deg2rad(observer.latDeg);

    const sinAlt =
      Math.sin(dec) * Math.sin(lat) +
      Math.cos(dec) * Math.cos(lat) * Math.cos(h);
    const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    const cosAlt = Math.cos(altRad);

    let azDeg = 0;
    if (Math.abs(cosAlt) > 1e-9) {
      const cosAz =
        (Math.sin(dec) - Math.sin(lat) * sinAlt) / (Math.cos(lat) * cosAlt);
      const azRad = Math.acos(Math.max(-1, Math.min(1, cosAz)));
      azDeg = rad2deg(azRad);
      if (Math.sin(h) > 0) {
        azDeg = 360 - azDeg;
      }
    }

    return {
      altDeg: rad2deg(altRad),
      azDeg: normalizeDeg(azDeg),
    };
  }

  // Convert ecliptic longitude/latitude (degrees) to equatorial RA/dec.
  function eclipticToEquatorial(lonDeg, latDeg, obliquityDeg) {
    const lon = deg2rad(lonDeg);
    const lat = deg2rad(latDeg);
    const eps = deg2rad(obliquityDeg);
    const raRad = Math.atan2(
      Math.sin(lon) * Math.cos(eps) - Math.tan(lat) * Math.sin(eps),
      Math.cos(lon),
    );
    const decRad = Math.asin(
      Math.sin(lat) * Math.cos(eps) +
        Math.cos(lat) * Math.sin(eps) * Math.sin(lon),
    );
    return {
      raHours: normalizeHours(rad2deg(raRad) / 15),
      decDeg: rad2deg(decRad),
    };
  }

  function meanObliquityDeg(t) {
    return 23.439291 - 0.0130042 * t - 1.64e-7 * t * t + 5.04e-7 * t * t * t;
  }

  // Meeus ch. 25 low-precision solar coordinates (apparent, ~0.01 deg).
  function sunEcliptic(jd) {
    const t = centuriesSinceJ2000(jd);
    const meanLon = normalizeDeg(280.46646 + 36000.76983 * t + 0.0003032 * t * t);
    const meanAnomaly = deg2rad(
      normalizeDeg(357.52911 + 35999.05029 * t - 0.0001537 * t * t),
    );
    const center =
      (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(meanAnomaly) +
      (0.019993 - 0.000101 * t) * Math.sin(2 * meanAnomaly) +
      0.000289 * Math.sin(3 * meanAnomaly);
    return {
      lonDeg: normalizeDeg(meanLon + center),
      latDeg: 0,
    };
  }

  function sunPosition(jd) {
    const t = centuriesSinceJ2000(jd);
    const ecliptic = sunEcliptic(jd);
    const equatorial = eclipticToEquatorial(
      ecliptic.lonDeg,
      ecliptic.latDeg,
      meanObliquityDeg(t),
    );
    return {
      raHours: equatorial.raHours,
      decDeg: equatorial.decDeg,
      eclipticLonDeg: ecliptic.lonDeg,
    };
  }

  // Meeus ch. 47 longitude terms (deg, sin): [coeff, D, M, Mprime, F].
  const MOON_LON_TERMS = [
    [6.288774, 0, 0, 1, 0],
    [1.274027, 2, 0, -1, 0],
    [0.658314, 2, 0, 0, 0],
    [0.213618, 0, 0, 2, 0],
    [-0.185116, 0, 1, 0, 0],
    [-0.114332, 0, 0, 0, 2],
    [0.058793, 2, 0, -2, 0],
    [0.057066, 2, -1, -1, 0],
    [0.053322, 2, 0, 1, 0],
    [0.045758, 2, -1, 0, 0],
    [-0.040923, 0, 1, -1, 0],
    [-0.034720, 1, 0, 0, 0],
    [-0.030383, 0, 1, 1, 0],
    [0.015327, 2, 0, 0, -2],
    [-0.012528, 0, 0, 1, 2],
    [0.010980, 0, 0, 1, -2],
    [0.010675, 4, 0, -1, 0],
    [0.010034, 0, 0, 3, 0],
    [0.008548, 4, 0, -2, 0],
    [-0.007888, 2, 1, -1, 0],
    [-0.006766, 2, 1, 0, 0],
    [-0.005163, 1, 0, -1, 0],
    [0.004987, 1, 1, 0, 0],
    [0.004036, 2, -1, 1, 0],
    [0.003994, 2, 0, 2, 0],
    [0.003861, 4, 0, 0, 0],
    [0.003665, 2, 0, -3, 0],
  ];

  // Meeus ch. 47 latitude terms (deg, sin): [coeff, D, M, Mprime, F].
  const MOON_LAT_TERMS = [
    [5.128122, 0, 0, 0, 1],
    [0.280602, 0, 0, 1, 1],
    [0.277693, 0, 0, 1, -1],
    [0.173237, 2, 0, 0, -1],
    [0.055413, 2, 0, -1, 1],
    [0.046271, 2, 0, -1, -1],
    [0.032573, 2, 0, 0, 1],
    [0.017198, 0, 0, 2, 1],
    [0.009266, 2, 0, 1, -1],
    [0.008822, 0, 0, 2, -1],
    [0.008216, 2, -1, 0, -1],
    [0.004324, 2, 0, -2, -1],
    [0.004200, 2, 0, 1, 1],
    [-0.003359, 2, 1, 0, -1],
    [0.002463, 2, -1, -1, 1],
  ];

  function moonFundamentals(t) {
    return {
      lprime: normalizeDeg(
        218.3164477 +
          481267.88123421 * t -
          0.0015786 * t * t +
          (t * t * t) / 538841 -
          (t * t * t * t) / 65194000,
      ),
      d: normalizeDeg(
        297.8501921 +
          445267.1114034 * t -
          0.0018819 * t * t +
          (t * t * t) / 545868 -
          (t * t * t * t) / 113065000,
      ),
      m: normalizeDeg(
        357.5291092 + 35999.0502909 * t - 0.0001536 * t * t + (t * t * t) / 24490000,
      ),
      mprime: normalizeDeg(
        134.9633964 +
          477198.8675055 * t +
          0.0087414 * t * t +
          (t * t * t) / 69699 -
          (t * t * t * t) / 14712000,
      ),
      f: normalizeDeg(
        93.272095 +
          483202.0175233 * t -
          0.0036539 * t * t -
          (t * t * t) / 3526000 +
          (t * t * t * t) / 863310000,
      ),
      e: 1 - 0.002516 * t - 0.0000074 * t * t,
    };
  }

  function sumMoonTerms(terms, args, e) {
    let total = 0;
    for (const [coeff, dCoef, mCoef, mpCoef, fCoef] of terms) {
      const arg = deg2rad(
        dCoef * args.d + mCoef * args.m + mpCoef * args.mprime + fCoef * args.f,
      );
      let term = coeff * Math.sin(arg);
      const mAbs = Math.abs(mCoef);
      if (mAbs === 1) {
        term *= e;
      } else if (mAbs === 2) {
        term *= e * e;
      }
      total += term;
    }
    return total;
  }

  function moonPosition(jd) {
    const t = centuriesSinceJ2000(jd);
    const args = moonFundamentals(t);
    const lonDeg = normalizeDeg(args.lprime + sumMoonTerms(MOON_LON_TERMS, args, args.e));
    const latDeg = sumMoonTerms(MOON_LAT_TERMS, args, args.e);
    const equatorial = eclipticToEquatorial(lonDeg, latDeg, meanObliquityDeg(t));

    // Meeus ch. 48: illuminated fraction k = (1 - cos psi) / 2 with the Sun at
    // effectively infinite distance, where psi is the geocentric elongation.
    const sun = sunEcliptic(jd);
    const cosElongation =
      Math.cos(deg2rad(latDeg)) * Math.cos(deg2rad(lonDeg - sun.lonDeg));
    const phaseFraction = (1 - cosElongation) / 2;

    return {
      raHours: equatorial.raHours,
      decDeg: equatorial.decDeg,
      phaseFraction: Math.max(0, Math.min(1, phaseFraction)),
    };
  }

  // Standish low-precision Keplerian elements at J2000 and per-century rates.
  // Fields: a (au), e, I (deg), L (deg), longPeri (deg), longNode (deg).
  const PLANET_ELEMENTS = {
    mercury: {
      base: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
      rate: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    },
    venus: {
      base: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
      rate: [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
    },
    earth: {
      base: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
      rate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
    },
    mars: {
      base: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
      rate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    },
    jupiter: {
      base: [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
      rate: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    },
    saturn: {
      base: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
      rate: [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
    },
  };

  function wrapDeg180(deg) {
    let wrapped = deg % 360;
    if (wrapped > 180) {
      wrapped -= 360;
    } else if (wrapped < -180) {
      wrapped += 360;
    }
    return wrapped;
  }

  // Solve Kepler's equation (Standish form, M and E in degrees).
  function eccentricAnomalyDeg(meanAnomalyDeg, e) {
    const eStar = rad2deg(e);
    let eccDeg = meanAnomalyDeg + eStar * Math.sin(deg2rad(meanAnomalyDeg));
    for (let i = 0; i < 8; i += 1) {
      const eccRad = deg2rad(eccDeg);
      const deltaM = meanAnomalyDeg - (eccDeg - eStar * Math.sin(eccRad));
      const deltaE = deltaM / (1 - e * Math.cos(eccRad));
      eccDeg += deltaE;
      if (Math.abs(deltaE) < 1e-9) {
        break;
      }
    }
    return eccDeg;
  }

  // Heliocentric ecliptic J2000 rectangular coordinates (au) for a planet.
  function heliocentricEcliptic(elements, t) {
    const a = elements.base[0] + elements.rate[0] * t;
    const e = elements.base[1] + elements.rate[1] * t;
    const inc = elements.base[2] + elements.rate[2] * t;
    const meanLon = elements.base[3] + elements.rate[3] * t;
    const longPeri = elements.base[4] + elements.rate[4] * t;
    const longNode = elements.base[5] + elements.rate[5] * t;

    const argPeri = longPeri - longNode;
    const meanAnomaly = wrapDeg180(meanLon - longPeri);
    const eccDeg = eccentricAnomalyDeg(meanAnomaly, e);
    const eccRad = deg2rad(eccDeg);

    const xOrbital = a * (Math.cos(eccRad) - e);
    const yOrbital = a * Math.sqrt(1 - e * e) * Math.sin(eccRad);

    const w = deg2rad(argPeri);
    const node = deg2rad(longNode);
    const i = deg2rad(inc);
    const cosW = Math.cos(w);
    const sinW = Math.sin(w);
    const cosNode = Math.cos(node);
    const sinNode = Math.sin(node);
    const cosI = Math.cos(i);
    const sinI = Math.sin(i);

    return {
      x:
        (cosW * cosNode - sinW * sinNode * cosI) * xOrbital +
        (-sinW * cosNode - cosW * sinNode * cosI) * yOrbital,
      y:
        (cosW * sinNode + sinW * cosNode * cosI) * xOrbital +
        (-sinW * sinNode + cosW * cosNode * cosI) * yOrbital,
      z: sinW * sinI * xOrbital + cosW * sinI * yOrbital,
    };
  }

  function planetPosition(name, jd) {
    const elements = PLANET_ELEMENTS[name];
    if (!elements) {
      return null;
    }
    const t = centuriesSinceJ2000(jd);
    const planet = heliocentricEcliptic(elements, t);
    const earth = heliocentricEcliptic(PLANET_ELEMENTS.earth, t);

    const xEcl = planet.x - earth.x;
    const yEcl = planet.y - earth.y;
    const zEcl = planet.z - earth.z;

    const eps = deg2rad(meanObliquityDeg(t));
    const xEq = xEcl;
    const yEq = Math.cos(eps) * yEcl - Math.sin(eps) * zEcl;
    const zEq = Math.sin(eps) * yEcl + Math.cos(eps) * zEcl;

    const raRad = Math.atan2(yEq, xEq);
    const decRad = Math.atan2(zEq, Math.sqrt(xEq * xEq + yEq * yEq));

    return {
      raHours: normalizeHours(rad2deg(raRad) / 15),
      decDeg: rad2deg(decRad),
    };
  }

  const API = {
    julianDate,
    gmstHours,
    lstHours,
    equatorialToHorizontal,
    sunPosition,
    moonPosition,
    planetPosition,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
  }

  if (typeof window !== "undefined") {
    window.StargazingAstro = API;
  }
}());
