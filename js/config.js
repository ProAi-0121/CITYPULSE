export const roadSpeeds = {
  primary: 60,
  secondary: 52,
  tertiary: 45,
  unclassified: 38,
  residential: 35,
  service: 25
};

export const roadWidth = {
  primary: 7,
  secondary: 6,
  tertiary: 5,
  unclassified: 4,
  residential: 4,
  service: 2
};

export const carImages = [
  "Audi A6.png",
  "Hyundai Creta.png",
  "Hyundai Exter.png",
  "Hyundai Verna.png",
  "Hyundai i20.png",
  "Kia Seltos.png",
  "Lamborghini Huracan.png",
  "Mahindra Scorpio.png",
  "Mahindra XUV700.png",
  "Maruti Alto.png",
  "Maruti Baleno.png",
  "Maruti Brezza.png",
  "Maruti Dzire.png",
  "Maruti Grand Vitara.png",
  "Maruti Swift.png",
  "Maruti WagonR.png",
  "Porshe 911.png",
  "Range Rover Sport.png",
  "Tata Altroz.png",
  "Tata Harrier.png",
  "Tata Nexon.png",
  "Tata Safari.png",
  "Tata Tiago.png",
  "Toyota Innova.png"
];

export const bikeImages = [
  "Honda CBR 650R.png",
  "Royal Enfield Classic 350.png",
  "Royal Enfield GT 650.png",
  "Royal Enfield Interceptor 650.png",
  "Royal Enfield Meteor 350.png"
];

export const carFolder = "Cars";
export const bikeFolder = "Bikes";

export const startCount = 45;
export const bikeChance = 0.3;

export const simMinutesPerSecond = 1;
export const startMinutes = 7 * 60;
export const nightDarkness = 0.38;

export const workStartSpread = 120;
export const workDurationMin = 480;
export const workDurationMax = 570;
export const departSpread = 90;
export const morningWindow = 150;
export const eveningWindow = 180;

export const lunchStart = 12 * 60 + 30;
export const lunchSpread = 60;
export const lunchChance = 0.6;

export const eveningMarketStart = 17.5 * 60;
export const eveningMarketEnd = 21 * 60;
export const eveningMarketChance = 0.25;

export const maxHomes = 300;

export const accidentChance = 0.00013;
export const accidentTreat = 30;
export const ambulanceCount = 2;
export const ambulanceSpeed = 55;

export const startBudget = 1000000;
export const dailyTax = 800;
export const satisfactionStart = 65;

export const shopCosts = {
  camera: 50000,
  police: 40000,
  signal: 80000
};

export const shopMaintenance = {
  camera: 2000,
  police: 5000,
  signal: 3000
};

export const fines = {
  speeding: 1000,
  redLight: 2000
};

export const cameraCatch = 1.08;
export const challanCooldown = 30;

export const weatherTypes = {
  clear: { icon: "☀️", label: "Clear", speed: 1, accident: 1, tint: 0 },
  rain: { icon: "🌧️", label: "Rain", speed: 0.85, accident: 1.6, tint: 0.22 },
  storm: { icon: "⛈️", label: "Storm", speed: 0.7, accident: 2.4, tint: 0.38 },
  fog: { icon: "🌫️", label: "Fog", speed: 0.6, accident: 2, tint: 0.45 }
};

export const weatherChangeMin = 120;
export const weatherChangeMax = 480;

export const carHeight = 30;
export const bikeHeight = 22;
export const carAspect = 0.45;
export const bikeAspect = 0.4;

export const signalCount = 20;
export const signalGreen = 9;
export const signalYellow = 2;
export const signalStop = 8;

export const maxRadius = 8000;
export const minRadius = 300;
