import { state } from "../state.js";
import {
  bikeChance,
  startCount,
  workStartSpread,
  workDurationMin,
  workDurationMax,
  departSpread,
  morningWindow,
  eveningWindow,
  lunchStart,
  lunchSpread,
  lunchChance,
  eveningMarketStart,
  eveningMarketEnd,
  eveningMarketChance,
  maxPopulation
} from "../config.js";
import { findRoute, nearestNode, randomNode } from "./route.js";
import { Vehicle } from "./vehicle.js";

export class Person {
  constructor(id, homeNode, workNode, marketNode) {
    this.id = id;
    this.home = homeNode;
    this.work = workNode;
    this.market = marketNode;

    this.kind = Math.random() < bikeChance ? "bike" : "car";
    this.vehicle = new Vehicle(id, this.kind);
    this.vehicle.atNode = homeNode;

    this.workStart = 8 * 60 + Math.random() * workStartSpread;
    this.workEnd = this.workStart + workDurationMin +
      Math.random() * (workDurationMax - workDurationMin);
    this.goHome = this.workEnd + Math.random() * departSpread;
    this.lunchAt = lunchStart + Math.random() * lunchSpread;
    this.lunchDay = -1;

    this.timer = Math.random() * 10;

    state.vehicles.push(this.vehicle);
  }

  newDay() {
    this.lunchDay = -1;
  }

  update(dt) {
    if (!this.vehicle.parked) return;

    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 8 + Math.random() * 12;

    const m = state.clock.minutes;
    const at = this.vehicle.atNode;
    let dest = null;

    if (at === this.home) {
      if (m >= this.workStart && m < this.workStart + morningWindow) {
        dest = this.work;
      } else if (
        m >= eveningMarketStart && m < eveningMarketEnd &&
        this.market && Math.random() < eveningMarketChance
      ) {
        dest = this.market;
      }
    } else if (at === this.work) {
      if (m >= this.lunchAt && m < this.lunchAt + 45 &&
        this.lunchDay !== state.clock.day && this.market &&
        Math.random() < lunchChance) {
        dest = this.market;
        this.lunchDay = state.clock.day;
      } else if (m >= this.goHome && m < this.goHome + eveningWindow) {
        dest = this.home;
      }
    } else if (at === this.market) {
      dest = m < 16 * 60 ? this.work : this.home;
    } else {
      dest = this.home;
    }

    if (dest == null) return;

    const route = findRoute(at, dest);
    if (route && route.length && this.vehicle.startTrip(route, dest)) {
      this.timer = 5;
    } else {
      this.timer = 30;
    }
  }
}

export function prepareDestinations(pois) {
  const homes = pois.homes.map(p => nearestNode(p.lat, p.lon));
  const works = pois.works.concat(pois.hospitals).map(p => nearestNode(p.lat, p.lon));
  const hospitals = pois.hospitals.map(p => nearestNode(p.lat, p.lon));
  const markets = pois.markets.map(p => nearestNode(p.lat, p.lon));
  const busstops = pois.busstops.map(p => nearestNode(p.lat, p.lon));

  state.pois = {
    homes: homes.filter(Boolean),
    works: works.filter(Boolean),
    hospitals: hospitals.filter(Boolean),
    markets: markets.filter(Boolean),
    busstops: busstops.filter(Boolean)
  };

  if (!state.pois.homes.length) {
    for (let i = 0; i < 10; i++) state.pois.homes.push(randomNode());
  }
  if (!state.pois.works.length) {
    for (let i = 0; i < 10; i++) state.pois.works.push(randomNode());
  }
  if (!state.pois.hospitals.length) {
    state.pois.hospitals.push(state.pois.works[0]);
  }
  if (state.pois.busstops.length < 2) {
    state.pois.busstops = [];
    for (let i = 0; i < 6; i++) state.pois.busstops.push(randomNode());
  }
}

export function createResidents(count = startCount) {
  const { homes, works, markets } = state.pois;
  for (let i = 0; i < count; i++) {
    if (state.people.length >= maxPopulation) return;
    const home = homes[Math.floor(Math.random() * homes.length)];
    const work = works[Math.floor(Math.random() * works.length)];
    const market = markets.length
      ? markets[Math.floor(Math.random() * markets.length)]
      : null;
    state.people.push(new Person(state.nextId, home, work, market));
    state.nextId++;
  }
}

export function dailyMigration() {
  const s = state.economy.satisfaction;
  let moveIn = 0;
  let moveOut = 0;

  if (s >= 75) moveIn = 2 + Math.floor(Math.random() * 3);
  else if (s >= 60) moveIn = Math.random() < 0.5 ? 1 : 0;
  else if (s < 45) moveOut = 1 + Math.floor(Math.random() * 3);
  else if (s < 55) moveOut = Math.random() < 0.4 ? 1 : 0;

  moveIn = Math.min(moveIn, Math.max(0, maxPopulation - state.people.length));
  for (let i = 0; i < moveIn; i++) createResidents(1);

  for (let i = 0; i < moveOut; i++) removeRandom();

  return { moveIn, moveOut };
}

function removeRandom() {
  const candidates = state.people.filter(p => p.vehicle.parked && !p.vehicle.crashed);
  if (candidates.length <= 5) return;

  const p = candidates[Math.floor(Math.random() * candidates.length)];
  if (state.selected === p.vehicle) state.selected = null;

  state.people.splice(state.people.indexOf(p), 1);
  const vi = state.vehicles.indexOf(p.vehicle);
  if (vi >= 0) state.vehicles.splice(vi, 1);
  p.vehicle.destroy();
}
