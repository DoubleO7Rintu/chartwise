import { OHLCV } from './indicators';

export interface CandlePattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  description: string;
  index: number;
  reliability: 'high' | 'medium' | 'low';
}

// Helper functions
const bodySize = (candle: OHLCV) => Math.abs(candle.close - candle.open);
const upperWick = (candle: OHLCV) => candle.high - Math.max(candle.open, candle.close);
const lowerWick = (candle: OHLCV) => Math.min(candle.open, candle.close) - candle.low;
const isBullish = (candle: OHLCV) => candle.close > candle.open;
const isBearish = (candle: OHLCV) => candle.close < candle.open;
const totalRange = (candle: OHLCV) => candle.high - candle.low;

// Single candle patterns
function detectDoji(candle: OHLCV, avgBody: number): CandlePattern | null {
  const body = bodySize(candle);
  if (body < avgBody * 0.1 && totalRange(candle) > avgBody * 0.5) {
    return {
      name: 'Doji',
      type: 'neutral',
      description: 'Indecision - potential reversal',
      index: 0,
      reliability: 'medium'
    };
  }
  return null;
}

function detectHammer(candle: OHLCV, avgBody: number): CandlePattern | null {
  const body = bodySize(candle);
  const lower = lowerWick(candle);
  const upper = upperWick(candle);
  
  if (lower > body * 2 && upper < body * 0.5 && body > avgBody * 0.3) {
    return {
      name: isBullish(candle) ? 'Hammer' : 'Hanging Man',
      type: isBullish(candle) ? 'bullish' : 'bearish',
      description: isBullish(candle) ? 'Bullish reversal signal' : 'Bearish reversal signal',
      index: 0,
      reliability: 'high'
    };
  }
  return null;
}

function detectShootingStar(candle: OHLCV, avgBody: number): CandlePattern | null {
  const body = bodySize(candle);
  const lower = lowerWick(candle);
  const upper = upperWick(candle);
  
  if (upper > body * 2 && lower < body * 0.5 && body > avgBody * 0.3) {
    return {
      name: isBearish(candle) ? 'Shooting Star' : 'Inverted Hammer',
      type: isBearish(candle) ? 'bearish' : 'bullish',
      description: isBearish(candle) ? 'Bearish reversal signal' : 'Potential bullish reversal',
      index: 0,
      reliability: 'high'
    };
  }
  return null;
}

function detectMarubozu(candle: OHLCV, avgBody: number): CandlePattern | null {
  const body = bodySize(candle);
  const upper = upperWick(candle);
  const lower = lowerWick(candle);
  
  if (body > avgBody * 1.5 && upper < body * 0.05 && lower < body * 0.05) {
    return {
      name: isBullish(candle) ? 'Bullish Marubozu' : 'Bearish Marubozu',
      type: isBullish(candle) ? 'bullish' : 'bearish',
      description: 'Strong momentum continuation',
      index: 0,
      reliability: 'high'
    };
  }
  return null;
}

// Two candle patterns
function detectEngulfing(prev: OHLCV, curr: OHLCV, avgBody: number): CandlePattern | null {
  const prevBody = bodySize(prev);
  const currBody = bodySize(curr);
  
  // Bullish engulfing
  if (isBearish(prev) && isBullish(curr) && 
      currBody > prevBody * 1.2 &&
      curr.open < prev.close && curr.close > prev.open) {
    return {
      name: 'Bullish Engulfing',
      type: 'bullish',
      description: 'Strong bullish reversal pattern',
      index: 0,
      reliability: 'high'
    };
  }
  
  // Bearish engulfing
  if (isBullish(prev) && isBearish(curr) && 
      currBody > prevBody * 1.2 &&
      curr.open > prev.close && curr.close < prev.open) {
    return {
      name: 'Bearish Engulfing',
      type: 'bearish',
      description: 'Strong bearish reversal pattern',
      index: 0,
      reliability: 'high'
    };
  }
  
  return null;
}

function detectPiercing(prev: OHLCV, curr: OHLCV): CandlePattern | null {
  if (isBearish(prev) && isBullish(curr) &&
      curr.open < prev.low &&
      curr.close > (prev.open + prev.close) / 2 &&
      curr.close < prev.open) {
    return {
      name: 'Piercing Line',
      type: 'bullish',
      description: 'Bullish reversal - closes above midpoint',
      index: 0,
      reliability: 'medium'
    };
  }
  return null;
}

function detectDarkCloud(prev: OHLCV, curr: OHLCV): CandlePattern | null {
  if (isBullish(prev) && isBearish(curr) &&
      curr.open > prev.high &&
      curr.close < (prev.open + prev.close) / 2 &&
      curr.close > prev.open) {
    return {
      name: 'Dark Cloud Cover',
      type: 'bearish',
      description: 'Bearish reversal - closes below midpoint',
      index: 0,
      reliability: 'medium'
    };
  }
  return null;
}

// Three candle patterns
function detectMorningStar(data: OHLCV[], idx: number, avgBody: number): CandlePattern | null {
  if (idx < 2) return null;
  const [first, second, third] = [data[idx - 2], data[idx - 1], data[idx]];
  
  if (isBearish(first) && bodySize(first) > avgBody &&
      bodySize(second) < avgBody * 0.3 &&
      isBullish(third) && bodySize(third) > avgBody &&
      third.close > (first.open + first.close) / 2) {
    return {
      name: 'Morning Star',
      type: 'bullish',
      description: 'Strong bullish reversal (3-candle)',
      index: 0,
      reliability: 'high'
    };
  }
  return null;
}

function detectEveningStar(data: OHLCV[], idx: number, avgBody: number): CandlePattern | null {
  if (idx < 2) return null;
  const [first, second, third] = [data[idx - 2], data[idx - 1], data[idx]];
  
  if (isBullish(first) && bodySize(first) > avgBody &&
      bodySize(second) < avgBody * 0.3 &&
      isBearish(third) && bodySize(third) > avgBody &&
      third.close < (first.open + first.close) / 2) {
    return {
      name: 'Evening Star',
      type: 'bearish',
      description: 'Strong bearish reversal (3-candle)',
      index: 0,
      reliability: 'high'
    };
  }
  return null;
}

function detectThreeWhiteSoldiers(data: OHLCV[], idx: number, avgBody: number): CandlePattern | null {
  if (idx < 2) return null;
  const candles = [data[idx - 2], data[idx - 1], data[idx]];
  
  if (candles.every(c => isBullish(c) && bodySize(c) > avgBody * 0.7) &&
      candles[1].close > candles[0].close &&
      candles[2].close > candles[1].close &&
      candles[1].open > candles[0].open &&
      candles[2].open > candles[1].open) {
    return {
      name: 'Three White Soldiers',
      type: 'bullish',
      description: 'Strong bullish continuation',
      index: 0,
      reliability: 'high'
    };
  }
  return null;
}

function detectThreeBlackCrows(data: OHLCV[], idx: number, avgBody: number): CandlePattern | null {
  if (idx < 2) return null;
  const candles = [data[idx - 2], data[idx - 1], data[idx]];
  
  if (candles.every(c => isBearish(c) && bodySize(c) > avgBody * 0.7) &&
      candles[1].close < candles[0].close &&
      candles[2].close < candles[1].close &&
      candles[1].open < candles[0].open &&
      candles[2].open < candles[1].open) {
    return {
      name: 'Three Black Crows',
      type: 'bearish',
      description: 'Strong bearish continuation',
      index: 0,
      reliability: 'high'
    };
  }
  return null;
}

// Main detection function
export function detectCandlePatterns(data: OHLCV[], lookback: number = 50): CandlePattern[] {
  if (data.length < 3) return [];
  
  const patterns: CandlePattern[] = [];
  const recentData = data.slice(-lookback);
  
  // Calculate average body size for context
  const avgBody = recentData.reduce((sum, c) => sum + bodySize(c), 0) / recentData.length;
  
  // Scan through recent candles
  for (let i = 0; i < recentData.length; i++) {
    const globalIdx = data.length - lookback + i;
    const candle = recentData[i];
    
    // Single candle patterns
    const doji = detectDoji(candle, avgBody);
    if (doji) { doji.index = globalIdx; patterns.push(doji); }
    
    const hammer = detectHammer(candle, avgBody);
    if (hammer) { hammer.index = globalIdx; patterns.push(hammer); }
    
    const shooting = detectShootingStar(candle, avgBody);
    if (shooting) { shooting.index = globalIdx; patterns.push(shooting); }
    
    const marubozu = detectMarubozu(candle, avgBody);
    if (marubozu) { marubozu.index = globalIdx; patterns.push(marubozu); }
    
    // Two candle patterns
    if (i > 0) {
      const prev = recentData[i - 1];
      
      const engulfing = detectEngulfing(prev, candle, avgBody);
      if (engulfing) { engulfing.index = globalIdx; patterns.push(engulfing); }
      
      const piercing = detectPiercing(prev, candle);
      if (piercing) { piercing.index = globalIdx; patterns.push(piercing); }
      
      const darkCloud = detectDarkCloud(prev, candle);
      if (darkCloud) { darkCloud.index = globalIdx; patterns.push(darkCloud); }
    }
    
    // Three candle patterns
    if (i >= 2) {
      const morning = detectMorningStar(recentData, i, avgBody);
      if (morning) { morning.index = globalIdx; patterns.push(morning); }
      
      const evening = detectEveningStar(recentData, i, avgBody);
      if (evening) { evening.index = globalIdx; patterns.push(evening); }
      
      const soldiers = detectThreeWhiteSoldiers(recentData, i, avgBody);
      if (soldiers) { soldiers.index = globalIdx; patterns.push(soldiers); }
      
      const crows = detectThreeBlackCrows(recentData, i, avgBody);
      if (crows) { crows.index = globalIdx; patterns.push(crows); }
    }
  }
  
  // Return only the most recent patterns (last 10)
  return patterns.slice(-10);
}

// Get pattern emoji
export function getPatternEmoji(type: 'bullish' | 'bearish' | 'neutral'): string {
  switch (type) {
    case 'bullish': return '🟢';
    case 'bearish': return '🔴';
    default: return '⚪';
  }
}
