import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  BarChart3,
  ArrowRight,
  UserPlus,
  Coins,
  ChevronRight,
  Monitor,
  Activity,
  Layers,
  Zap,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import type { Column } from '../components/Table';
import { priceService } from '../services/priceService';
import { assetService } from '../services/assetService';
import { AssetLogo } from '../components/AssetLogo';

interface MarketTickerItem {
  id?: string;
  ticker: string;
  name: string;
  price: number;
  change: number;
  type: 'stock' | 'crypto';
  logoUrl: string;
}

const LANDING_TICKERS = ['BTC', 'ETH', 'BNB', 'NVDA', 'TSLA', 'MSFT'] as const;

const FALLBACK_TICKER_DATA: MarketTickerItem[] = [
  { id: 'crypto-btc', ticker: 'BTC', name: 'Bitcoin', price: 67450.0, change: 2.1, type: 'crypto', logoUrl: '/assets/logos/crypto/btc.svg' },
  { id: 'crypto-eth', ticker: 'ETH', name: 'Ethereum', price: 3540.2, change: 1.5, type: 'crypto', logoUrl: '/assets/logos/crypto/eth.svg' },
  { id: 'crypto-bnb', ticker: 'BNB', name: 'BNB', price: 585.3, change: 0.9, type: 'crypto', logoUrl: '/assets/logos/crypto/bnb.svg' },
  { id: 'stock-nvda', ticker: 'NVDA', name: 'NVIDIA Corp.', price: 875.12, change: 4.8, type: 'stock', logoUrl: '/assets/logos/stocks/nvda.svg' },
  { id: 'stock-tsla', ticker: 'TSLA', name: 'Tesla Inc.', price: 178.2, change: -2.4, type: 'stock', logoUrl: '/assets/logos/stocks/tsla.svg' },
  { id: 'stock-msft', ticker: 'MSFT', name: 'Microsoft Corp.', price: 415.6, change: 0.8, type: 'stock', logoUrl: '/assets/logos/stocks/msft.svg' },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tickerData, setTickerData] = useState<MarketTickerItem[]>(FALLBACK_TICKER_DATA);
  const [orderBookSpread, setOrderBookSpread] = useState(67450.0);
  const [orderBookBids, setOrderBookBids] = useState([
    { price: 67420.1, qty: 2.115 },
    { price: 67390.8, qty: 0.844 },
    { price: 67365.0, qty: 0.198 },
  ]);
  const [orderBookAsks, setOrderBookAsks] = useState([
    { price: 67540.2, qty: 0.412 },
    { price: 67510.5, qty: 1.25 },
    { price: 67495.0, qty: 0.095 },
  ]);

  // 1. Candlestick Canvas Animation Background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    interface Candle {
      x: number;
      y: number;
      h: number;
      w: number;
      high: number;
      low: number;
      color: string;
      speed: number;
    }

    const candles: Candle[] = [];
    const numCandles = Math.floor(window.innerWidth / 80);

    for (let i = 0; i < numCandles; i++) {
      const isGreen = Math.random() > 0.4;
      candles.push({
        x: i * 80 + Math.random() * 30,
        y: Math.random() * (window.innerHeight - 300) + 100,
        h: Math.random() * 90 + 30,
        w: 8,
        high: Math.random() * 30 + 10,
        low: Math.random() * 30 + 10,
        color: isGreen ? 'rgba(201, 168, 76, 0.08)' : 'rgba(31, 41, 55, 0.12)',
        speed: Math.random() * 0.2 + 0.08,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle network grid lines
      ctx.strokeStyle = 'rgba(31, 41, 55, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 150) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 150) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      candles.forEach((candle) => {
        ctx.strokeStyle = candle.color;
        ctx.fillStyle = candle.color;
        ctx.lineWidth = 1;

        // Wick
        ctx.beginPath();
        ctx.moveTo(candle.x + candle.w / 2, candle.y - candle.high);
        ctx.lineTo(candle.x + candle.w / 2, candle.y + candle.h + candle.low);
        ctx.stroke();

        // Body
        ctx.fillRect(candle.x, candle.y, candle.w, candle.h);

        // Movement
        candle.x -= candle.speed;
        if (candle.x + candle.w < 0) {
          candle.x = canvas.width;
          candle.y = Math.random() * (canvas.height - 350) + 120;
          const isGreen = Math.random() > 0.4;
          candle.color = isGreen ? 'rgba(201, 168, 76, 0.08)' : 'rgba(31, 41, 55, 0.12)';
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 2. Fetch live prices from Firestore or fallback
  useEffect(() => {
    let unsubscribePrices: (() => void) | null = null;

    Promise.all([assetService.getAssets(), priceService.getAllPrices()])
      .then(([assets, prices]) => {
        if (assets.length === 0) return;
        setTickerData(LANDING_TICKERS.map((ticker, index) => {
          const asset = assets.find((candidate) => candidate.ticker === ticker);
          const fallback = FALLBACK_TICKER_DATA.find((candidate) => candidate.ticker === ticker)!;
          return {
            id: asset?.id || fallback.id,
            ticker,
            name: asset?.name || fallback.name,
            price: prices[ticker] || fallback.price,
            change: index % 3 === 2 ? -0.4 : 0.6,
            type: asset?.type || fallback.type,
            logoUrl: asset?.logoUrl || fallback.logoUrl,
          };
        }));
      })
      .catch((error) => {
        console.warn('Firestore asset catalog unavailable, using landing fallbacks:', error);
      });

    try {
      unsubscribePrices = priceService.onPricesChange((pricesMap) => {
        if (Object.keys(pricesMap).length > 0) {
          setTickerData((currentTickerData) => currentTickerData.map((item) => {
            if (pricesMap[item.ticker] !== undefined) {
              return { ...item, price: pricesMap[item.ticker] };
            }
            return item;
          }));

          // Sync the mock terminal spread with real-time BTC price if available
          if (pricesMap['BTC']) {
            setOrderBookSpread(pricesMap['BTC']);
          }
        }
      });
    } catch (err) {
      console.warn('Firestore price subscription unavailable, using fallbacks:', err);
    }

    return () => {
      if (unsubscribePrices) unsubscribePrices();
    };
  }, []);

  // 3. Mini Order Book fluctuations simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuate spreads slightly
      setOrderBookSpread((prev) => {
        const delta = (Math.random() - 0.5) * 8;
        const newSpread = Number((prev + delta).toFixed(2));
        
        // Adjust bids/asks relative to spread
        setOrderBookBids([
          { price: Number((newSpread - 30).toFixed(1)), qty: Number((Math.random() * 3).toFixed(3)) },
          { price: Number((newSpread - 60).toFixed(1)), qty: Number((Math.random() * 2).toFixed(3)) },
          { price: Number((newSpread - 85).toFixed(1)), qty: Number((Math.random() * 1.5).toFixed(3)) },
        ]);
        setOrderBookAsks([
          { price: Number((newSpread + 90).toFixed(1)), qty: Number((Math.random() * 1).toFixed(3)) },
          { price: Number((newSpread + 60).toFixed(1)), qty: Number((Math.random() * 2).toFixed(3)) },
          { price: Number((newSpread + 45).toFixed(1)), qty: Number((Math.random() * 1.2).toFixed(3)) },
        ]);
        return newSpread;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Columns for Live Market Table
  const liveMarketColumns: Column<MarketTickerItem>[] = [
    {
      header: 'Asset Name',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-3.5">
          <AssetLogo name={row.name} ticker={row.ticker} logoUrl={row.logoUrl} />
          <div>
            <div className="text-textPrimary font-bold text-sm tracking-wide">{row.name}</div>
            <div className="text-textSecondary text-[10px] tracking-widest uppercase font-mono mt-0.5">{row.ticker}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Market Value',
      key: 'price',
      render: (row) => (
        <span className="font-mono text-textPrimary font-semibold text-sm">
          ${row.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Net Change',
      key: 'change',
      render: (row) => (
        <span className={`font-mono text-xs font-bold ${row.change >= 0 ? 'text-success' : 'text-danger'}`}>
          {row.change >= 0 ? '▲ +' : '▼ '}
          {Math.abs(row.change)}%
        </span>
      ),
    },
    {
      header: '24h Trend',
      key: 'trend',
      render: (row) => {
        const isUp = row.change >= 0;
        const strokeColor = isUp ? '#22C55E' : '#EF4444';
        const path = isUp
          ? 'M5 22 L20 12 L35 18 L50 8 L65 10 L80 3'
          : 'M5 3 L20 15 L35 10 L50 22 L65 18 L80 25';
        return (
          <svg className="w-20 h-7 overflow-visible opacity-85" viewBox="0 0 85 28">
            <path d={path} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      },
    },
    {
      header: 'Action',
      key: 'action',
      render: () => (
        <Button
          variant="ghost"
          className="min-h-[36px] h-9 px-4.5 text-[10px] font-extrabold uppercase tracking-widest text-goldAccent border border-goldAccent/25 hover:border-goldAccent hover:bg-goldAccent/5 rounded-[6px]"
          onClick={() => navigate('/auth')}
        >
          Initialize
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#060810] text-textPrimary relative overflow-hidden flex flex-col">
      {/* Canvas behind all content */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Decorative Blur Spheres */}
      <div className="absolute top-[10%] left-[-15%] h-[500px] w-[500px] bg-goldAccent/4 rounded-full blur-[110px] pointer-events-none z-0" />
      <div className="absolute bottom-[20%] right-[-10%] h-[600px] w-[600px] bg-[#22C55E]/2 rounded-full blur-[130px] pointer-events-none z-0" />

      {/* Sticky glass navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glassmorphism border-b border-borderCustom/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5 cursor-pointer select-none" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-goldAccent text-bgMain font-black text-xl border border-goldAccent/40 shadow-[0_0_20px_rgba(201,168,76,0.3)]">
              VM
            </div>
            <div>
              <span className="font-black text-xl tracking-wider text-textPrimary">VANTAGE</span>
              <span className="font-semibold text-[9px] tracking-[0.3em] text-goldAccent block -mt-1 uppercase">MARKETS</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <Button
              variant="ghost"
              className="text-xs font-bold uppercase tracking-widest text-textSecondary hover:text-textPrimary"
              onClick={() => navigate('/auth')}
            >
              Sign In
            </Button>
            <Button
              variant="primary"
              className="text-xs font-extrabold uppercase tracking-widest h-11 min-h-[44px] px-6 shadow-[0_0_15px_rgba(201,168,76,0.15)]"
              onClick={() => navigate('/auth')}
            >
              Start Trading
            </Button>
          </div>
        </div>
      </nav>

      {/* Spacer for navbar */}
      <div className="h-20 w-full shrink-0" />

      {/* Scrolling market ticker */}
      <section className="relative z-10 w-full bg-surface/50 backdrop-blur-md border-b border-borderCustom py-3 select-none">
        <div className="ticker-wrap w-full overflow-hidden">
          <div className="ticker-content">
            {[...tickerData, ...tickerData].map((item, idx) => (
              <div key={idx} className="inline-flex items-center gap-3 font-mono text-xs shrink-0">
                <span className="font-bold text-textPrimary tracking-wide uppercase">{item.ticker}</span>
                <span className="text-textSecondary/80">
                  ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`font-semibold text-[10px] ${item.change >= 0 ? 'text-success' : 'text-danger'}`}>
                  {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Split-Hero Section */}
      <header className="relative z-10 w-full min-h-[calc(100vh-140px)] flex items-center py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Headline copy */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-goldAccent/30 bg-goldAccent/5 text-goldAccent text-[10px] font-bold uppercase tracking-wider mb-8 animate-fadeIn">
              <Activity className="w-3.5 h-3.5" /> Institutional Liquidity Arrays
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-textPrimary leading-[1.05] mb-6 uppercase">
              Elite Asset Desks <br />
              <span className="bg-gradient-to-r from-goldAccent via-[#F6E6C2] to-[#B8923E] bg-clip-text text-transparent">
                Trade The Advantage
              </span>
            </h1>

            <p className="text-sm md:text-base text-textSecondary max-w-xl font-medium leading-relaxed mb-10">
              Access stock equities and cryptocurrency assets on a high-frequency trading desk. Run instant client balance checks without locally cached registries.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <Button
                variant="primary"
                fullWidth
                className="h-12.5 min-h-[50px] text-xs font-extrabold uppercase tracking-widest shadow-[0_0_25px_rgba(201,168,76,0.2)]"
                onClick={() => navigate('/auth')}
              >
                Create Account <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="secondary"
                fullWidth
                className="h-12.5 min-h-[50px] text-xs font-extrabold uppercase tracking-widest border border-borderCustom hover:border-goldAccent/40 bg-surface/30"
                onClick={() => {
                  const el = document.getElementById('live-markets');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                View Listed Assets
              </Button>
            </div>
          </div>

          {/* Right Column: Vantage Live Terminal Mockup */}
          <div className="lg:col-span-5 w-full relative">
            <div className="absolute inset-0 bg-goldAccent/5 rounded-[16px] blur-[30px] pointer-events-none" />
            
            <div className="relative w-full h-[460px] bg-[#0E1322] border border-borderCustom rounded-[16px] overflow-hidden shadow-2xl flex flex-col">
              
              {/* Mock Terminal Title Bar */}
              <div className="bg-[#090C16] px-4 py-3 border-b border-borderCustom flex items-center justify-between text-xs select-none">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-danger/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-success/80" />
                  <span className="ml-2.5 font-mono text-textSecondary uppercase tracking-widest text-[9px] font-bold">Vantage Terminal</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[9px] text-goldAccent bg-goldAccent/10 border border-goldAccent/25 px-2 py-0.5 rounded uppercase tracking-wider font-extrabold">
                  Live Feed
                </div>
              </div>

              {/* Mock Terminal Contents */}
              <div className="flex-1 grid grid-cols-12 bg-bgMain/25">
                
                {/* Mock Order Book (col-span-4) */}
                <div className="col-span-4 border-r border-borderCustom p-3 font-mono text-[9px] flex flex-col justify-between select-none">
                  <div className="text-textSecondary uppercase font-extrabold text-[8px] tracking-wider mb-2">Order Book</div>
                  
                  {/* Ask limits (Red) */}
                  <div className="flex flex-col gap-1.5">
                    {orderBookAsks.map((ask, i) => (
                      <div key={i} className="text-danger flex justify-between text-[10px]">
                        <span>{ask.price.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
                        <span className="text-textSecondary/60">{ask.qty}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Real-time Spread */}
                  <div className="text-goldAccent font-black text-center border-y border-borderCustom/50 py-2 my-2 bg-goldAccent/5 text-[10.5px]">
                    {orderBookSpread.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    <div className="text-[7.5px] text-textSecondary font-bold tracking-wider mt-0.5 uppercase">BTC / USD</div>
                  </div>
                  
                  {/* Bid limits (Green) */}
                  <div className="flex flex-col gap-1.5">
                    {orderBookBids.map((bid, i) => (
                      <div key={i} className="text-success flex justify-between text-[10px]">
                        <span>{bid.price.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
                        <span className="text-textSecondary/60">{bid.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mock Graph (col-span-8) */}
                <div className="col-span-8 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-borderCustom/40 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-textPrimary font-mono">BTC Price Feed</span>
                      <span className="text-[10px] text-success font-mono font-bold">+2.14%</span>
                    </div>
                    <span className="text-[10px] text-textSecondary font-mono font-semibold">1m Interval</span>
                  </div>

                  {/* SVG Price Chart */}
                  <div className="flex-grow min-h-[180px] flex items-center justify-center relative my-3">
                    <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-none opacity-20">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="border-t border-l border-borderCustom/60" />
                      ))}
                    </div>

                    <svg className="w-full h-full absolute inset-0 z-10" viewBox="0 0 300 150">
                      <defs>
                        <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(201, 168, 76, 0.3)" />
                          <stop offset="100%" stopColor="rgba(201, 168, 76, 0)" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 150 L20 120 L50 130 L90 80 L130 95 L170 50 L210 65 L250 20 L280 35 L300 10 L300 150 Z"
                        fill="url(#glowGrad)"
                      />
                      <path
                        d="M0 150 L20 120 L50 130 L90 80 L130 95 L170 50 L210 65 L250 20 L280 35 L300 10"
                        fill="none"
                        stroke="#C9A84C"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="300" cy="10" r="5" fill="#C9A84C" className="animate-ping" />
                      <circle cx="300" cy="10" r="3" fill="#C9A84C" />
                    </svg>
                  </div>

                  {/* Quick Action buttons */}
                  <div className="grid grid-cols-2 gap-3 mt-auto pt-3 border-t border-borderCustom/30">
                    <button
                      onClick={() => navigate('/auth')}
                      className="bg-danger/10 border border-danger/25 text-danger hover:bg-danger/20 hover:border-danger transition-colors text-[9px] font-bold py-2 rounded uppercase tracking-widest font-mono cursor-pointer"
                    >
                      Sell Short
                    </button>
                    <button
                      onClick={() => navigate('/auth')}
                      className="bg-success/10 border border-success/25 text-success hover:bg-success/20 hover:border-success transition-colors text-[9px] font-bold py-2 rounded uppercase tracking-widest font-mono cursor-pointer"
                    >
                      Buy Spot
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </header>

      {/* Live markets preview list */}
      <section id="live-markets" className="relative z-10 max-w-7xl mx-auto px-6 py-24 w-full">
        <div className="text-center mb-16">
          <span className="text-[10px] font-bold text-goldAccent uppercase tracking-[0.25em] block mb-2 font-mono">Spot Valuation Index</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-textPrimary uppercase tracking-tight">Vantage Floor Pricing</h2>
          <p className="text-xs text-textSecondary max-w-md mx-auto mt-2 font-medium">Real-time asset tickers compiled from global liquidity pools.</p>
        </div>

        <Table columns={liveMarketColumns} data={tickerData.slice(0, 6)} />
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 w-full border-t border-borderCustom/30">
        <div className="text-center mb-20">
          <span className="text-[10px] font-bold text-goldAccent uppercase tracking-[0.25em] block mb-2 font-mono">Execution Cycle</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-textPrimary uppercase tracking-tight">Process Execution</h2>
          <p className="text-xs text-textSecondary max-w-md mx-auto mt-2 font-medium">Onboard your asset profile securely in three stages.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card variant="standard" className="flex flex-col items-start text-left p-8 border border-borderCustom/60 bg-surface/30 relative overflow-hidden group hover:border-goldAccent/30 duration-300">
            <div className="text-xs font-mono font-bold text-goldAccent/40 mb-6">01 / REGISTRATION</div>
            <div className="h-12 w-12 rounded-lg bg-goldAccent/10 border border-goldAccent/25 flex items-center justify-center text-goldAccent mb-6">
              <UserPlus className="w-5.5 h-5.5" />
            </div>
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider mb-2">Create Security Key</h3>
            <p className="text-xs text-textSecondary leading-relaxed font-medium">
              Submit your verification parameters. Account registry takes under five minutes to secure server access.
            </p>
          </Card>

          <Card variant="standard" className="flex flex-col items-start text-left p-8 border border-borderCustom/60 bg-surface/30 relative overflow-hidden group hover:border-goldAccent/30 duration-300">
            <div className="text-xs font-mono font-bold text-goldAccent/40 mb-6">02 / CAPITALIZATION</div>
            <div className="h-12 w-12 rounded-lg bg-goldAccent/10 border border-goldAccent/25 flex items-center justify-center text-goldAccent mb-6">
              <Coins className="w-5.5 h-5.5" />
            </div>
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider mb-2">Initialize Escrow Deposit</h3>
            <p className="text-xs text-textSecondary leading-relaxed font-medium">
              Wire funds securely into active addresses. Deposits register to transaction logs for admin checks.
            </p>
          </Card>

          <Card variant="standard" className="flex flex-col items-start text-left p-8 border border-borderCustom/60 bg-surface/30 relative overflow-hidden group hover:border-goldAccent/30 duration-300">
            <div className="text-xs font-mono font-bold text-goldAccent/40 mb-6">03 / TRADING</div>
            <div className="h-12 w-12 rounded-lg bg-goldAccent/10 border border-goldAccent/25 flex items-center justify-center text-goldAccent mb-6">
              <BarChart3 className="w-5.5 h-5.5" />
            </div>
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider mb-2">Execute Orders</h3>
            <p className="text-xs text-textSecondary leading-relaxed font-medium">
              Monitor dynamic balance values calculated client-side according to real-time firestore pricing pools.
            </p>
          </Card>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 w-full border-t border-borderCustom/30">
        <div className="text-center mb-16">
          <span className="text-[10px] font-bold text-goldAccent uppercase tracking-[0.25em] block mb-2 font-mono font-extrabold">System Architecture</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-textPrimary uppercase tracking-tight">Institutional Engine</h2>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Large featured (colspan-2) */}
          <Card variant="standard" className="md:col-span-2 p-8 flex flex-col justify-between border border-borderCustom/60 bg-surface/30 min-h-[260px]">
            <div className="flex h-11 w-11 rounded-lg bg-goldAccent/10 border border-goldAccent/25 items-center justify-center text-goldAccent mb-6">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-textPrimary">Client Desk Terminal</h3>
              <p className="text-xs text-textSecondary leading-relaxed max-w-xl">
                A dark-luxury workspace optimized for speed. Our client dashboard tracks real-time spot pricing feeds natively in the Firestore array, recalculating net position asset weights dynamically on the browser.
              </p>
            </div>
          </Card>

          {/* Card 2: Tall item (rowspan-2) */}
          <Card variant="standard" className="p-8 flex flex-col justify-between border border-borderCustom/60 bg-surface/30 md:row-span-2 min-h-[300px]">
            <div className="flex h-11 w-11 rounded-lg bg-goldAccent/10 border border-goldAccent/25 items-center justify-center text-goldAccent mb-6">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-goldAccent mb-3 uppercase tracking-widest">Locked Security</div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-textPrimary">Escrow Address Managers</h3>
              <p className="text-xs text-textSecondary leading-relaxed">
                Deposits routing through dedicated active nodes validated directly on the admin portal. All transactions are fully audited and locked to user profile variables.
              </p>
            </div>
          </Card>

          {/* Card 3: Standard item */}
          <Card variant="standard" className="p-8 flex flex-col justify-between border border-borderCustom/60 bg-surface/30 min-h-[220px]">
            <div className="flex h-11 w-11 rounded-lg bg-goldAccent/10 border border-goldAccent/25 items-center justify-center text-goldAccent mb-6">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-textPrimary">Zero Local Storage</h3>
              <p className="text-xs text-textSecondary leading-relaxed">
                Equity variables are calculated live, protecting assets registries against browser injection vulnerabilities.
              </p>
            </div>
          </Card>

          {/* Card 4: Horizontal Featured (colspan-2) */}
          <Card variant="standard" className="md:col-span-2 p-8 flex flex-col justify-between border border-borderCustom/60 bg-surface/30 min-h-[220px]">
            <div className="flex h-11 w-11 rounded-lg bg-goldAccent/10 border border-goldAccent/25 items-center justify-center text-goldAccent mb-6">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-textPrimary">Vercel price crons</h3>
              <p className="text-xs text-textSecondary leading-relaxed">
                Twelve Data and CoinGecko feed pricing coordinates directly into database cells every three hours via secure cron scripts, ensuring user position valuations remain highly accurate.
              </p>
            </div>
          </Card>

        </div>
      </section>

      {/* Statistics bar */}
      <section className="relative z-10 w-full bg-surface/40 backdrop-blur-sm border-y border-borderCustom/60 py-16 text-center">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="text-3xl md:text-4xl font-extrabold text-goldAccent font-mono tracking-tight">12,400+</div>
            <div className="text-[10px] text-textSecondary font-bold uppercase tracking-wider mt-1.5 font-mono">Active Traders</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-extrabold text-textPrimary font-mono tracking-tight">$4.2M+</div>
            <div className="text-[10px] text-textSecondary font-bold uppercase tracking-wider mt-1.5 font-mono">Volume Traded</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-extrabold text-textPrimary font-mono tracking-tight">50+</div>
            <div className="text-[10px] text-textSecondary font-bold uppercase tracking-wider mt-1.5 font-mono">Assets Listed</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-extrabold text-goldAccent font-mono tracking-tight">24/7</div>
            <div className="text-[10px] text-textSecondary font-bold uppercase tracking-wider mt-1.5 font-mono">Expert Support</div>
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 w-full text-center">
        <div className="glassmorphism border border-borderCustom rounded-[24px] p-12 md:p-20 relative overflow-hidden flex flex-col items-center shadow-2xl">
          {/* Accent decoration glow inside the card */}
          <div className="absolute top-0 right-0 h-64 w-64 bg-goldAccent/3 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-64 w-64 bg-[#EF4444]/2 rounded-full blur-[80px] pointer-events-none" />

          <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-textPrimary tracking-tight leading-tight max-w-2xl relative z-10 uppercase">
            Secure Your Market Edge
          </h2>
          <p className="text-xs md:text-sm text-textSecondary max-w-md mt-4 mb-10 font-semibold relative z-10">
            Obtain your dedicated client portfolio key today. Access real-time price feeds, instant balances, and institutional layouts.
          </p>
          <Button
            variant="primary"
            className="h-12.5 min-h-[50px] text-xs font-extrabold uppercase tracking-widest px-10 relative z-10 shadow-[0_0_20px_rgba(201,168,76,0.25)]"
            onClick={() => navigate('/auth')}
          >
            Start Trading Now <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-borderCustom/50 bg-bgMain mt-auto select-none">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 flex items-center justify-center rounded bg-goldAccent text-bgMain font-black text-sm border border-goldAccent/40">
              VM
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider text-textPrimary">VANTAGE</span>
              <span className="font-medium text-[8px] tracking-[0.25em] text-goldAccent block -mt-1 uppercase">MARKETS</span>
            </div>
          </div>

          <div className="flex gap-8 text-[10px] font-extrabold text-textSecondary uppercase tracking-widest">
            <a href="#terms" className="hover:text-goldAccent transition-colors">Terms of Use</a>
            <a href="#privacy" className="hover:text-goldAccent transition-colors">Privacy Policy</a>
            <a href="#support" className="hover:text-goldAccent transition-colors" onClick={(e) => { e.preventDefault(); navigate('/auth'); }}>Support Desk</a>
          </div>

          <div className="text-[10px] text-textSecondary font-semibold tracking-wide uppercase font-mono">
            &copy; 2026 Vantage Markets. Trade with the advantage.
          </div>
        </div>
      </footer>
    </div>
  );
};
