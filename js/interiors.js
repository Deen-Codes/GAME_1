// Enterable interiors. Rooms are built far away from the city (at ORIGIN) and the player is moved
// there, so the normal movement, camera and collision code keeps working. South wall is cut away.
import * as THREE from '../lib/three.module.min.js';
import { FURN, buildFurn } from './furniture.js?v=191';
import { addCollider, removeCollider } from './world.js?v=191';
import { buildCar } from './car.js?v=191';

export const ORIGIN = { x: 0, z: 2600 };
const T = (name, w, d, floor, wall, items, npcs, spots, extra = {}) => ({ name, w, d, floor, wall, items, npcs, spots, ...extra });
export const INTERIORS = {
  guns: T('Bay Arms', 18, 14, '#4a443e', '#7a6e62', [['counter', -3, -4.4], ['gunwall', -3, -6.75], ['lane', 4.2, 4.2], ['lane', 6.4, 4.2], ['plant', -8, 5.8], ['sign', -3, -6.8, 0, '#ff5a3c']],
    [{ role: 'gun', x: -3, z: -5.4 }], [{ kind: 'talk', x: -3, z: -3.1, label: 'Talk', icon: 'chat' }, { kind: 'range', x: 5.3, z: 5.4, label: 'Range', icon: 'target' }]),
  mall: T('Bay City Mall', 26, 18, '#ece6dc', '#f4f4f6', [['counter', -8, -7.3, 0, '#ff6fb5'], ['rack', -10, -4], ['rack', -7, -4, 0, '#2f80ed'], ['rack', -4, -4, 0, '#ffd23f'], ['mirror', -11.6, -8.85], ['counter', 7, -7.3, 0, '#ffd23f'], ['table', 4, -2], ['table', 8, -2], ['table', 4, 1.5], ['table', 8, 1.5], ['arcade', -10, 4], ['arcade', -8.8, 4], ['arcade', -7.6, 4], ['palm', 0, -1], ['palm', -2, 6], ['palm', 11.5, 7], ['sign', -8, -8.9, 0, '#ff6fb5'], ['sign', 7, -8.9, 0, '#ffd23f']],
    [{ role: 'clerk', x: -8, z: -8.2 }, { role: 'cook', x: 7, z: -8.2 }], [{ kind: 'mirror', x: -11, z: -7.5, label: 'Fashion', icon: 'shirt' }, { kind: 'mallfood', x: 7, z: -6, label: 'Food court', icon: 'food' }, { kind: 'arcade', x: -8.8, z: 2.6, label: 'Arcade', icon: 'play' }]),
  tattoo: T('Tattoo Parlour', 12, 9, '#1e1a22', '#2a2230', [['barberchair', -3, -2.4], ['barberchair', 0.5, -2.4], ['painting', -4.5, -4.4, 0, '#ff5a8a'], ['painting', -2.5, -4.4, 0, '#38e8ff'], ['painting', -0.5, -4.4, 0, '#ffd23f'], ['painting', 1.5, -4.4, 0, '#4cd964'], ['counter', 3.8, 1.6, 0, '#3a2a3a'], ['armchair', -4.9, 2.6, Math.PI / 2, '#8b1e3f'], ['armchair', -4.9, 1.2, Math.PI / 2, '#8b1e3f'], ['plant', 5.2, -3.8], ['lamp', -1.3, -3.9], ['sign', 3.6, -4.45, 0, '#ff5a8a']],
    [{ role: 'barber', x: -1.7, z: -2.4 }, { role: 'clerk', x: 3.8, z: 0.7 }], [{ kind: 'tattoo', x: -1.5, z: -0.6, label: 'Get inked', icon: 'edit' }, { kind: 'talk', x: 3.8, z: 2.9, label: 'Talk', icon: 'chat' }], { light: '#ff9ac0', dark: true }),
  burgershop: T('Bay Burger', 14, 10, '#d8d2c8', '#f6e6b4', [['counter', -2, -3.3, 0, '#c9302c'], ['stove', -4, -4.6], ['stove', -3, -4.6], ['fridge', -5.9, -4.5], ['booth', 3.8, -2.4], ['booth', 3.8, 1.6], ['table', 0.5, 2.2, 0, '#c9302c'], ['chair', -0.4, 2.2, Math.PI / 2], ['chair', 1.4, 2.2, -Math.PI / 2], ['plant', -6.2, 3.8], ['sign', 0.8, -4.9, 0, '#ffd23f']],
    [{ role: 'cook', x: -3.5, z: -3.9 }, { role: 'waiter', x: -1.4, z: -4.2 }], [{ kind: 'biz', x: -1.4, z: -1.6, label: 'Manager', icon: 'case' }], { light: '#fff1d0' }),
  laundry: T('Suds Laundromat', 12, 9, '#e8e8ea', '#bfe6f0', [['washer', -4.4, -4.0], ['washer', -3.5, -4.0], ['washer', -2.6, -4.0], ['washer', -1.7, -4.0], ['washer', -0.8, -4.0], ['washer', 0.1, -4.0], ['washer', 1.0, -4.0], ['counter', 4, -1.6, 0, '#5a6b7a'], ['table', -2, 0.8, 0, '#e8e8ea'], ['chair', -4.6, 2.4, Math.PI / 2], ['chair', -4.6, 1.4, Math.PI / 2], ['plant', 5.2, 3.6], ['sign', 3.5, -4.45, 0, '#38e8ff']],
    [{ role: 'clerk', x: 4, z: -2.5 }], [{ kind: 'biz', x: 4, z: -0.3, label: 'Manager', icon: 'case' }], { light: '#f0f8ff' }),
  clothes: T('Clothes Store', 14, 10, '#e8e2d6', '#f2d6dc', [['counter', 3.6, -3.3, 0, '#e8e2d6'], ['rack', -4, -2.5], ['rack', -4, 1.2, 0, '#2f80ed'], ['rack', -0.5, 1.2, 0, '#ffd23f'], ['mirror', 5.6, -4.85], ['plant', -6, -4.2], ['sign', 0, -4.9, 0, '#ff6fb5']],
    [{ role: 'clerk', x: 3.6, z: -4.25 }], [{ kind: 'talk', x: 3.6, z: -2.1, label: 'Talk', icon: 'chat' }, { kind: 'mirror', x: 5.6, z: -3.6, label: 'Try on', icon: 'shirt' }]),
  barber: T('Barbershop', 11, 8, '#2a2a30', '#e8e2d6', [['barberchair', -3, -2.4], ['barberchair', 0, -2.4], ['barberchair', 3, -2.4], ['mirror', -3, -3.85], ['mirror', 0, -3.85], ['mirror', 3, -3.85], ['pole', 4.9, -3.6], ['chair', -4.4, 2.6, Math.PI / 2], ['chair', -4.4, 1.6, Math.PI / 2]],
    [{ role: 'barber', x: 1.1, z: -2.0 }], [{ kind: 'talk', x: 0.6, z: -0.6, label: 'Talk', icon: 'chat' }]),
  diner: T('Diner', 14, 10, '#d8d2c8', '#9fd8e8', [['counter', -3, -3.3, 0, '#c9302c'], ['stool', -4.2, -2.3], ['stool', -3, -2.3], ['stool', -1.8, -2.3], ['booth', 3.8, -2.4], ['booth', 3.8, 1.6], ['sign', 0, -4.9, 0, '#38e8ff']],
    [{ role: 'waiter', x: -3, z: -4.2 }], [{ kind: 'talk', x: -3, z: -1.4, label: 'Order', icon: 'food' }, { kind: 'staff', x: -6, z: 3.8, label: 'Staff door', icon: 'case' }]),
  mart: T('QuickMart', 12, 10, '#e8e8ea', '#f6f6f6', [['shelf', -2.5, -3.9], ['shelf', -2.5, 0.2], ['counter', 3.5, -1.5, 0, '#3a3d45'], ['fridge', 5.3, -4.3, 0, '#e8e8ea'], ['fridge', 4.3, -4.3, 0, '#e8e8ea']],
    [{ role: 'cashier', x: 3.5, z: -2.4 }], [{ kind: 'talk', x: 3.5, z: -0.3, label: 'Buy', icon: 'cart' }, { kind: 'staff', x: -4.5, z: 3.6, label: 'Staff door', icon: 'case' }]),
  gym: T('Iron Temple Gym', 16, 12, '#2f3036', '#5a5d66', [['bench', -5.5, -3.6], ['bench', -2.5, -3.6], ['tread', 3, -3.6], ['tread', 5, -3.6], ['bag', -5.5, 2.6], ['bag', -3.5, 2.6], ['mirror', 0, -5.85], ['sign', 0, -5.9, 0, '#ff8a2a']],
    [{ role: 'trainer', x: 0.5, z: -1 }], [{ kind: 'lift', x: -4, z: -1.7, label: 'Lift', icon: 'dumbbell' }, { kind: 'tread', x: 4, z: -1.6, label: 'Run', icon: 'run' }, { kind: 'bag', x: -4.5, z: 4.2, label: 'Box', icon: 'fist' }, { kind: 'talk', x: 0.5, z: 0.4, label: 'Talk', icon: 'chat' }]),
  casino: T('Lucky 7 Casino', 18, 14, '#5a1a2a', '#2a1020', [['bjtable', -4, -2], ['bjtable', 1, -2], ['slot', 5, -6.3], ['slot', 6, -6.3], ['slot', 7, -6.3], ['counter', -6, -5.6, 0, '#c9a24a'], ['sign', 0, -6.9, 0, '#ffd23f'], ['palm', -8, 6], ['palm', 8, 6]],
    [{ role: 'croupier', x: -4, z: -2.7 }, { role: 'croupier', x: 1, z: -2.7 }, { role: 'cashier', x: -6, z: -6.4 }], [{ kind: 'blackjack', x: -4, z: -0.4, label: 'Blackjack', icon: 'cards' }, { kind: 'blackjack', x: 1, z: -0.4, label: 'Blackjack', icon: 'cards' }, { kind: 'slots', x: 6, z: -5, label: 'Slots', icon: 'slots' }, { kind: 'talk', x: -6, z: -4.4, label: 'Cashier', icon: 'chat' }], { light: '#ffcf8a' }),
  motors: T('Bay Motors', 24, 16, '#d8d8de', '#eef2f6', [['podium', -7, -2.5], ['podium', 0, -3.5], ['podium', 7, -2.5], ['counter', 0, 4.4, 0, '#3a3d45'], ['plant', -11, 7], ['plant', 11, 7], ['sign', 0, -7.9, 0, '#2f80ed']],
    [{ role: 'sales', x: 0, z: 3.5 }], [{ kind: 'talk', x: 0, z: 5.6, label: 'Talk', icon: 'chat' }], { cars: [[-7, -2.5], [0, -3.5], [7, -2.5]] }),
  casa: T('Casa Bay Furniture', 16, 12, '#c9b89a', '#f2ebe0', [['couch', -5, -4], ['tv', -5, -5.5], ['bed', 1, -3.6], ['bookshelf', 5.6, -5.6], ['aquarium', 6, 0], ['arcade', 6.6, 3.5], ['palm', -7, 4.5], ['rug', -5, -2], ['counter', 3, 3.8, 0, '#7a5230'], ['lamp', -2.6, -5.3]],
    [{ role: 'clerk', x: 3, z: 2.9 }], [{ kind: 'talk', x: 3, z: 5.1, label: 'Browse', icon: 'sofa' }]),
  bar: T('The Anchor', 12, 10, '#5a4030', '#3a2a1a', [['barcounter', 0, -3.3], ['stool', -1.5, -2.4], ['stool', 0, -2.4], ['stool', 1.5, -2.4], ['table', -3.5, 2, 0, '#7a5230'], ['table', 3.5, 2, 0, '#7a5230'], ['chair', -4.6, 2], ['chair', 4.6, 2]],
    [{ role: 'bartender', x: 0, z: -4.2 }], [{ kind: 'talk', x: 0, z: -1.4, label: 'Order', icon: 'drink' }], { light: '#ffb35c' }),
  pit: T('The Pit', 20, 16, '#3a3a40', '#2a2628', [['cage', 1, -1.5], ['barcounter', -7.5, 5.5], ['sign', 1, -7.9, 0, '#ff3b3b'], ['stool', -8.5, 4.5], ['stool', -6.5, 4.5], ['chair', 7.5, 4.5], ['chair', 8.5, 4.5]],
    [{ role: 'bookie', x: -6.5, z: -5.6 }, { role: 'bartender', x: -7.5, z: 6.5 }], [{ kind: 'fight', x: 1, z: 2.6, label: 'Enter the cage', icon: 'fist' }, { kind: 'talk', x: -6.5, z: -4.2, label: 'Bookie', icon: 'cash' }, { kind: 'talk', x: -7.5, z: 4.2, label: 'Bar', icon: 'drink' }], { light: '#ff6a3a', dark: true }),
  police: T('Bay City PD', 18, 14, '#7a8090', '#c8ccd4', [['counter', -4, -3.4], ['desk', -6.5, 1.5, 0, '#5a4a3a'], ['desk', -2.5, 1.5, 0, '#5a4a3a'], ['chair', -6.5, 2.4], ['chair', -2.5, 2.4], ['plant', -8, -6], ['sign', -4, -6.9, 0, '#2a6aff'],
    ['cellwall', 2.2, -5.8], ['cellwall', 5.2, -5.8], ['cellwall', 8.2, -5.8], ['cellbars', 3.7, -4.6], ['cellbars', 6.7, -4.6], ['cot', 3.0, -6.2, Math.PI / 2], ['cot', 6.0, -6.2, Math.PI / 2], ['chair', 4.5, 3.8], ['chair', 5.5, 3.8], ['chair', 6.5, 3.8], ['chair', 7.5, 3.8]],
    [{ role: 'cop', x: -4, z: -4.6 }, { role: 'cop', x: -6.5, z: 2.6 }], [{ kind: 'talk', x: -4, z: -2.2, label: 'Front desk', icon: 'shield' }, { kind: 'staff', x: 7.8, z: 1.5, label: 'Staff office', icon: 'case' }], { light: '#e8eef8' }),
  hospital: T('Bay General Hospital', 20, 14, '#e4eaee', '#f4f7f9', [['counter', -6, -3.8], ['plant', -9.2, -6.2], ['plant', -9.2, 5.6], ['chair', -8.6, 1.2], ['chair', -7.6, 1.2], ['chair', -6.6, 1.2], ['chair', -8.6, 3], ['chair', -7.6, 3], ['chair', -6.6, 3],
    ['hbed', 0.5, -5.4], ['curtain', 2, -5.3], ['hbed', 3.5, -5.4], ['curtain', 5, -5.3], ['hbed', 6.5, -5.4], ['monitor', 1.4, -6.4], ['monitor', 4.4, -6.4], ['monitor', 7.4, -6.4], ['hbed', 8.4, 2.5, Math.PI / 2], ['curtain', 8.4, 0.6, Math.PI / 2], ['monitor', 9.4, 3.6], ['sign', -6, -6.9, 0, '#e23b3b']],
    [{ role: 'nurse', x: -6, z: -5 }, { role: 'doctor', x: 3.5, z: -2.6 }], [{ kind: 'talk', x: -6, z: -2.6, label: 'Reception', icon: 'cross' }, { kind: 'rest', x: 0.5, z: -3.6, label: 'Rest ($150)', icon: 'bed' }, { kind: 'talk', x: 3.5, z: -1.4, label: 'Doctor', icon: 'chat' }, { kind: 'staff', x: 8.5, z: -5.5, label: 'Staff room', icon: 'case' }], { light: '#e8f4ff' }),
  church: T('Bay Chapel', 14, 20, '#9a8a74', '#ece4d0', [['altar', 0, -7.4], ['candles', -2.2, -8.2], ['candles', 2.2, -8.2], ['stained', -3.6, -9.9], ['stained', 0, -9.9], ['stained', 3.6, -9.9], ['rug', 0, -2, 0, '#8b1e3f'], ['rug', 0, 1.6, 0, '#8b1e3f'], ['plant', -6.2, -8.6], ['plant', 6.2, -8.6],
    ['pew', -3.8, -4], ['pew', 3.8, -4], ['pew', -3.8, -2], ['pew', 3.8, -2], ['pew', -3.8, 0], ['pew', 3.8, 0], ['pew', -3.8, 2], ['pew', 3.8, 2], ['pew', -3.8, 4], ['pew', 3.8, 4]],
    [{ role: 'pastor', x: 0, z: -8.6 }], [{ kind: 'talk', x: 0, z: -6.1, label: 'Talk', icon: 'chat' }, { kind: 'pray', x: 0, z: 2.6, label: 'Sit & reflect', icon: 'heart' }], { light: '#ffe2b0' }),
  club: T('Neon Room', 18, 14, '#14101e', '#1e1430', [['dancefloor', 0, 0.5], ['djbooth', 0, -5], ['barcounter', -6.5, 4.5], ['sign', 0, -6.9, 0, '#38e8ff']],
    [{ role: 'dj', x: 0, z: -5.9 }, { role: 'bartender', x: -6.5, z: 3.6 }], [{ kind: 'dj', x: 0, z: -3.9, label: 'DJ', icon: 'music' }, { kind: 'dance', x: 0, z: 0.5, label: 'Dance', icon: 'smile' }, { kind: 'talk', x: -6.5, z: 5.9, label: 'Bar', icon: 'drink' }], { light: '#b26bff', dark: true }),
  prison: T('Bay County Correctional', 60, 56, '#9a9ea6', '#c8ccd4', [['shower', 29.2, 3.2, -Math.PI / 2, '#c8ccd4'], ['shower', 29.2, 5.4, -Math.PI / 2, '#c8ccd4'], ['shower', 29.2, 7.6, -Math.PI / 2, '#c8ccd4'], ['shower', 29.2, 9.8, -Math.PI / 2, '#c8ccd4'], ['cot', -6.5, -27.3, Math.PI / 2], ['toilet', -5.45, -27.6, 0], ['cellbars', -6.5, -25.3, 0], ['cot', -3.5, -27.3, Math.PI / 2], ['toilet', -2.45, -27.6, 0], ['cellbars', -3.5, -25.3, 0], ['cot', -0.5, -27.3, Math.PI / 2], ['toilet', 0.55, -27.6, 0], ['cellbars', -0.5, -25.3, 0], ['cot', 2.5, -27.3, Math.PI / 2], ['toilet', 3.55, -27.6, 0], ['cellbars', 2.5, -25.3, 0], ['cot', 5.5, -27.3, Math.PI / 2], ['toilet', 6.55, -27.6, 0], ['cellbars', 5.5, -25.3, 0], ['cot', 8.5, -27.3, Math.PI / 2], ['toilet', 9.55, -27.6, 0], ['cellbars', 8.5, -25.3, 0], ['cot', 11.5, -27.3, Math.PI / 2], ['toilet', 12.55, -27.6, 0], ['cellbars', 11.5, -25.3, 0], ['cellwall', -5, -26.8, 0], ['cellwall', -2, -26.8, 0], ['cellwall', 1, -26.8, 0], ['cellwall', 4, -26.8, 0], ['cellwall', 7, -26.8, 0], ['cellwall', 10, -26.8, 0], ['cellwall', 13, -26.8, 0], ['cot', -6.5, -27.3, Math.PI / 2, null, 3.2], ['toilet', -5.45, -27.6, 0, null, 3.2], ['cellbars', -6.5, -25.3, 0, null, 3.2], ['cot', -3.5, -27.3, Math.PI / 2, null, 3.2], ['toilet', -2.45, -27.6, 0, null, 3.2], ['cellbars', -3.5, -25.3, 0, null, 3.2], ['cot', -0.5, -27.3, Math.PI / 2, null, 3.2], ['toilet', 0.55, -27.6, 0, null, 3.2], ['cellbars', -0.5, -25.3, 0, null, 3.2], ['cot', 2.5, -27.3, Math.PI / 2, null, 3.2], ['toilet', 3.55, -27.6, 0, null, 3.2], ['cellbars', 2.5, -25.3, 0, null, 3.2], ['cot', 5.5, -27.3, Math.PI / 2, null, 3.2], ['toilet', 6.55, -27.6, 0, null, 3.2], ['cellbars', 5.5, -25.3, 0, null, 3.2], ['cot', 8.5, -27.3, Math.PI / 2, null, 3.2], ['toilet', 9.55, -27.6, 0, null, 3.2], ['cellbars', 8.5, -25.3, 0, null, 3.2], ['cot', 11.5, -27.3, Math.PI / 2, null, 3.2], ['toilet', 12.55, -27.6, 0, null, 3.2], ['cellbars', 11.5, -25.3, 0, null, 3.2], ['cellwall', -5, -26.8, 0, null, 3.2], ['cellwall', -2, -26.8, 0, null, 3.2], ['cellwall', 1, -26.8, 0, null, 3.2], ['cellwall', 4, -26.8, 0, null, 3.2], ['cellwall', 7, -26.8, 0, null, 3.2], ['cellwall', 10, -26.8, 0, null, 3.2], ['cellwall', 13, -26.8, 0, null, 3.2], ['ptable', -3, -12], ['ptable', 3, -12], ['ptable', -3, -5], ['tv', -7.6, -1, Math.PI / 2], ['couch', -5.6, -1, -Math.PI / 2, '#5a6b7a'], ['tower', 8, 7], ['sign', 3, -27.9, 0, '#ff8a2a', 6.2], ['serving', -28.4, 1, Math.PI / 2], ['ptable', -21, -6], ['ptable', -14, -6], ['ptable', -21, -0.5], ['ptable', -14, -0.5], ['ptable', -21, 5], ['ptable', -14, 5], ['sign', -19, -9.9, 0, '#ffd23f'], ['bookshelf', -26, -27.6], ['bookshelf', -23, -27.6], ['bookshelf', -20, -27.6], ['bookshelf', -17, -27.6], ['table', -20, -19, 0, '#7a5230'], ['chair', -21.5, -19], ['chair', -18.5, -19], ['armchair', -27, -14, Math.PI / 2, '#8b1e3f'], ['court', 22, -8], ['hoop', 29.4, -8, -Math.PI / 2], ['bench', 18, -24], ['bench', 21, -24], ['bag', 25, -25], ['bag', 27.5, -25], ['fence', 16, -27.85], ['fence', 20, -27.85], ['fence', 24, -27.85], ['fence', 28, -27.85], ['fence', 29.85, -24, Math.PI / 2], ['fence', 29.85, -20, Math.PI / 2], ['fence', 29.85, 4, Math.PI / 2], ['fence', 29.85, 8, Math.PI / 2], ['counter', 0, 21.5], ['gate', 0, 18, 0], ['chair', -7.5, 25.5], ['chair', -6.5, 25.5], ['chair', -5.5, 25.5], ['chair', 5.5, 25.5], ['chair', 6.5, 25.5], ['plant', -9, 27], ['plant', 9, 27], ['sign', 0, 18.3, 0, '#2a6aff'], ['payphone', -29.7, 21, Math.PI / 2], ['payphone', -29.7, 23, Math.PI / 2], ['table', -19, 23, 0, '#9aa0aa'], ['chair', -19, 22.1], ['chair', -19, 23.9, Math.PI], ['table', -14, 23, 0, '#9aa0aa'], ['chair', -14, 22.1], ['chair', -14, 23.9, Math.PI], ['hbed', 15, 26.2], ['curtain', 16.8, 26.2], ['hbed', 19, 26.2], ['curtain', 20.8, 26.2], ['hbed', 23, 26.2], ['monitor', 16, 27.4], ['monitor', 20, 27.4], ['monitor', 24, 27.4], ['plant', 28.5, 19.5]],
    [{ role: 'guard', x: 0, z: 20.6, id: 'grimes' }, { role: 'cook', x: -29.3, z: 1, id: 'joy', face: Math.PI / 2 }, { role: 'nurse', x: 20, z: 21.5, id: 'nurse' }, { role: 'fed', x: -19, z: 24.0, id: 'walsh', face: Math.PI },
    { role: 'inmate', x: -14, z: 0.4, id: 'tony', face: Math.PI }, { role: 'inmate', x: 21, z: -4, id: 'dre' }, { role: 'inmate', x: -19, z: -20.2, id: 'pops' }, { role: 'inmate', x: 25, z: 2, id: 'rico' }, { role: 'inmate', x: 16, z: -22.2, id: 'moose' }, { role: 'inmate', x: -21, z: -5.2, id: 'mikey' },
    { role: 'guard', x: 17, z: 8, id: 'guard2' }], [{ kind: 'bunk', x: 2.5, z: -26.4, label: 'Your bunk', icon: 'bed' }, { kind: 'shower', x: 26.6, z: 6.5, label: 'Showers', icon: 'wave' }, { kind: 'canteen', x: -26.8, z: 1, label: 'Canteen', icon: 'food' }, { kind: 'plift', x: 19.5, z: -22.2, label: 'Lift weights', icon: 'dumbbell' }, { kind: 'hoops', x: 27.6, z: -8, label: 'Shoot hoops', icon: 'target' }, { kind: 'payphone', x: -28.6, z: 22, label: 'Pay phone', icon: 'phone' }, { kind: 'infirmary', x: 17, z: 23.6, label: 'Infirmary', icon: 'cross' }, { kind: 'library', x: -20, z: -17.4, label: 'Library', icon: 'book' }, { kind: 'tvroom', x: -5.6, z: 0.6, label: 'Watch TV', icon: 'tv' }], { light: '#f0f4ff', prison: true, walls: [
      [-30, 17.85, -21.5, 18.15], [-18.5, 17.85, -1.5, 18.15], [1.5, 17.85, 18.5, 18.15], [21.5, 17.85, 30, 18.15],
      [-10.15, 18, -9.85, 28], [9.85, 18, 10.15, 28],
      [-30, 11.85, -20, 12.15], [-17, 11.85, 1, 12.15], [4, 11.85, 21, 12.15], [24, 11.85, 30, 12.15],
      [-8.15, -28, -7.85, 2], [-8.15, 5, -7.85, 12], [13.85, -28, 14.15, -2], [13.85, 1, 14.15, 12],
      [-30, -10.15, -20, -9.85], [-17, -10.15, -8, -9.85],
      [-8, -28.3, 14, -28, 6.4],
    ], floors: [[-10, 18, 10, 28, '#cfd3da'], [-30, 18, -10, 28, '#b8a890'], [10, 18, 30, 28, '#e4eaee'], [-30, 12, 30, 18, '#a8acb4'], [-30, -10, -8, 12, '#d8d2c8'], [-8, -28, 14, 12, '#8f939b'], [14, -28, 30, 12, '#4f535a'], [-30, -28, -8, -10, '#9a7a5a']], decks: [{ x0: -8, z0: -28, x1: 14, z1: -22.6, y: 3.2, rail: [[-8, 10.4]], posts: [[-4, -22.8], [2, -22.8], [8, -22.8]] }], ramps: [{ x0: 10.6, z0: -22.6, x1: 13.6, z1: -14, y0: 3.2, y1: 0 }], lights: [[0, 23], [-20, 23], [20, 23], [-15, 15], [15, 15], [-19, -4], [-19, 6], [3, -16], [3, 4], [22, -18], [22, 2], [-19, -19]] }),
  college: T('Bay City College', 22, 16, '#b89a7a', '#efe6d6', [['board', 3, -7.9], ['desk', 0, -4, 0, '#7a5230'], ['desk', 3, -4, 0, '#7a5230'], ['desk', 6, -4, 0, '#7a5230'], ['desk', 0, -1.2, 0, '#7a5230'], ['desk', 3, -1.2, 0, '#7a5230'], ['desk', 6, -1.2, 0, '#7a5230'], ['chair', 0, -3.1], ['chair', 3, -3.1], ['chair', 6, -3.1], ['chair', 0, -0.3], ['chair', 6, -0.3],
    ['counter', -7, -2.6, 0, '#3a5fa0'], ['bookshelf', -10.6, 2, Math.PI / 2], ['bookshelf', -10.6, 3.6, Math.PI / 2], ['bookshelf', -10.6, 5.2, Math.PI / 2], ['table', -7, 5, 0, '#7a5230'], ['chair', -8, 5, Math.PI / 2], ['chair', -6, 5, -Math.PI / 2], ['plant', 10, -7], ['plant', -10, -7], ['sign', -7, -7.9, 0, '#2f80ed']],
    [{ role: 'sales', x: -7, z: -3.6 }, { role: 'professor', x: 3, z: -6.6 }, { role: 'guest', x: 0, z: -3.0 }, { role: 'guest', x: 6, z: -0.2 }], [{ kind: 'admissions', x: -7, z: -1.3, label: 'Admissions', icon: 'book' }, { kind: 'class', x: 3, z: -0.1, label: 'Attend class', icon: 'brain' }, { kind: 'study', x: -7, z: 6.4, label: 'Study', icon: 'book' }], { light: '#fff1dc' }),
  office: T('Bay Corp Tower', 20, 14, '#3a3d45', '#dfe3ea', [['counter', 0, -4.2, 0, '#e8e2d6'], ['sign', 0, -6.9, 0, '#38e8ff'], ['desk', -6.5, -0.5, 0, '#e8e2d6'], ['desk', -3.5, -0.5, 0, '#e8e2d6'], ['desk', 3.5, -0.5, 0, '#e8e2d6'], ['desk', 6.5, -0.5, 0, '#e8e2d6'], ['desk', -6.5, 3, 0, '#e8e2d6'], ['desk', 6.5, 3, 0, '#e8e2d6'], ['chair', -6.5, 0.4], ['chair', -3.5, 0.4], ['chair', 3.5, 0.4], ['chair', 6.5, 0.4], ['chair', -6.5, 3.9], ['chair', 6.5, 3.9], ['plant', -9, -6], ['plant', 9, -6], ['couch', -6, 6, Math.PI, '#3a3d45']],
    [{ role: 'sales', x: 0, z: -5.1 }, { role: 'guest', x: -6.5, z: 0.5 }, { role: 'guest', x: 3.5, z: 0.5 }, { role: 'guest', x: 6.5, z: 3.9 }], [{ kind: 'staff', x: 0, z: -2.8, label: 'Reception: jobs', icon: 'case' }], { light: '#eef4ff' }),
  // homes
  // starter flat: open-plan kitchen/living room, and a bedroom with its own en-suite (shower + toilet)
  studio: T('Studio', 14, 10, '#c9b89a', '#e8e2d6', [], [], [], { home: true, layout: 2,
    walls: [[1.9, -5, 2.1, 1.2, 2.6, '#e8e2d6'], [1.9, 2.8, 2.1, 5, 2.6, '#e8e2d6'], [4.2, -5, 4.4, -1.8, 2.6, '#dfe8ec'], [4.3, -1.9, 5.2, -1.7, 2.6, '#dfe8ec'], [6.3, -1.9, 7, -1.7, 2.6, '#dfe8ec']],
    floors: [[-7, -5, -1.5, -2.6, '#d9d2c6'], [4.4, -5, 7, -1.9, '#cfe0e8'], [2.1, -5, 4.2, 5, '#a89bb8'], [4.2, -1.7, 7, 5, '#a89bb8']] }),
  apartment: T('Apartment', 16, 11, '#b89a7a', '#e6e9f0', [], [], [], { home: true, layout: 2,
    walls: [[2.9, -5.5, 3.1, 0.8, 2.6], [2.9, 2.4, 3.1, 5.5, 2.6], [5.4, -5.5, 5.6, -2.3, 2.6, '#dfe8ec'], [5.5, -2.4, 6.2, -2.2, 2.6, '#dfe8ec'], [7.3, -2.4, 8, -2.2, 2.6, '#dfe8ec']],
    floors: [[-8, -5.5, -2.5, -2.8, '#d9d2c6'], [5.6, -5.5, 8, -2.4, '#cfe0e8'], [3.1, -5.5, 5.4, 5.5, '#9a8a7a'], [5.4, -2.2, 8, 5.5, '#9a8a7a']] }),
  // the money homes: big open-plan living with floor-to-ceiling windows, a proper kitchen island, master suite with a bathtub
  penthouse: T('Penthouse', 24, 16, '#4a3a32', '#f2f2f4', [], [], [], { home: true, layout: 1, light: '#fff4e0',
    walls: [[4.9, -8, 5.1, 0.8, 3], [4.9, 2.6, 5.1, 8, 3], [8.4, -8, 8.6, -3, 3, '#dfe8ec'], [8.5, -3.1, 9.4, -2.9, 3, '#dfe8ec'], [10.6, -3.1, 12, -2.9, 3, '#dfe8ec']],
    floors: [[-12, -8, -5, -3.5, '#e8e8ea'], [8.6, -8, 12, -3.1, '#e4eaee'], [5.1, -8, 8.4, 8, '#5a4a40'], [8.4, -2.9, 12, 8, '#5a4a40']] }),
  villa: T('Villa', 22, 14, '#c9a27a', '#f6f0e4', [], [], [], { home: true, layout: 1, light: '#fff1d6',
    walls: [[4.9, -7, 5.1, 0.6, 2.8], [4.9, 2.2, 5.1, 7, 2.8], [8.2, -7, 8.4, -2.6, 2.8, '#dfe8ec'], [8.3, -2.7, 9.0, -2.5, 2.8, '#dfe8ec'], [10.2, -2.7, 11, -2.5, 2.8, '#dfe8ec']],
    floors: [[-11, -7, -5, -3.5, '#e8e2d6'], [8.4, -7, 11, -2.7, '#e4eaee'], [5.1, -7, 8.2, 7, '#a08060'], [8.2, -2.5, 11, 7, '#a08060']] }),
  house: T('House', 18, 12, '#a0805a', '#efe6d6', [], [], [], { home: true, layout: 2,
    walls: [[3.9, -6, 4.1, 1.5, 2.6, '#efe6d6'], [3.9, 3.1, 4.1, 6, 2.6, '#efe6d6'], [6.1, -6, 6.3, -2.6, 2.6, '#dfe8ec'], [6.2, -2.7, 7.1, -2.5, 2.6, '#dfe8ec'], [8.2, -2.7, 9, -2.5, 2.6, '#dfe8ec']],
    floors: [[-9, -6, -3, -3, '#d9d2c6'], [6.3, -6, 9, -2.7, '#cfe0e8'], [4.1, -6, 6.1, 6, '#9a8a7a'], [6.1, -2.5, 9, 6, '#9a8a7a']] }),
  mansion: T('Mansion', 26, 18, '#e8e2d6', '#fff8ee', [], [], [], { home: true, layout: 1, light: '#fff4e0',
    walls: [[5.9, -9, 6.1, 1, 3.2], [5.9, 2.8, 6.1, 9, 3.2], [9.4, -9, 9.6, -3.6, 3.2, '#dfe8ec'], [9.5, -3.7, 10.4, -3.5, 3.2, '#dfe8ec'], [11.6, -3.7, 13, -3.5, 3.2, '#dfe8ec']],
    floors: [[-13, -9, -6, -4.5, '#f2ece2'], [9.6, -9, 13, -3.7, '#e4eaee'], [6.1, -9, 9.4, 9, '#8a6a5a'], [9.4, -3.5, 13, 9, '#8a6a5a'], [-13, 4, -7, 9, '#3a3d45']] }),
};
// default furniture for each home layout: kitchen along the back, sofa facing the TV, bed in the bedroom, en-suite fittings
export const HOME_DEFAULTS = {
  studio: [{ t: 'fridge', x: -6.4, z: -4.5, r: 0 }, { t: 'stove', x: -5.3, z: -4.5, r: 0 }, { t: 'table', x: -3.6, z: -3.4, r: 0 }, { t: 'tv', x: -6.6, z: 1.8, r: Math.PI / 2 }, { t: 'couch', x: -3.4, z: 1.8, r: -Math.PI / 2, c: '#5a6b7a' }, { t: 'plant', x: 1.4, z: -4.5, r: 0 }, { t: 'single', x: 5.4, z: 2.5, r: 0, c: '#3a5fa0' }, { t: 'shower', x: 6.3, z: -4.3, r: 0 }, { t: 'toilet', x: 4.95, z: -4.5, r: 0, c: '#f4f6f8' }],
  apartment: [{ t: 'fridge', x: -7.4, z: -5, r: 0 }, { t: 'stove', x: -6.3, z: -5, r: 0 }, { t: 'table', x: -4.4, z: -3.6, r: 0 }, { t: 'chair', x: -5.3, z: -3.6, r: Math.PI / 2 }, { t: 'chair', x: -3.5, z: -3.6, r: -Math.PI / 2 }, { t: 'tv', x: -7.6, z: 1.5, r: Math.PI / 2 }, { t: 'couch', x: -4.4, z: 1.5, r: -Math.PI / 2, c: '#3a3d45' }, { t: 'rug', x: -6, z: 1.5, r: Math.PI / 2, c: '#a03a4f' }, { t: 'plant', x: 2.3, z: -4.9, r: 0 }, { t: 'skywin', x: -1, z: -5.44, r: 0 }, { t: 'bed', x: 6.7, z: 0.4, r: 0, c: '#3a5fa0' }, { t: 'shower', x: 7.3, z: -4.8, r: 0 }, { t: 'toilet', x: 6.1, z: -5.0, r: 0, c: '#f4f6f8' }, { t: 'desk', x: 4.3, z: 4.9, r: Math.PI }],
  penthouse: [{ t: 'fridge', x: -11.3, z: -7.5, r: 0, c: '#3a3d45' }, { t: 'stove', x: -10.1, z: -7.5, r: 0, c: '#3a3d45' }, { t: 'barcart', x: -8.2, z: -7.6, r: 0, c: '#16161b' }, { t: 'island', x: -9, z: -4.8, r: 0 }, { t: 'stool', x: -9.6, z: -3.8, r: Math.PI }, { t: 'stool', x: -8.4, z: -3.8, r: Math.PI },
    { t: 'table', x: -9, z: -0.5, r: 0, c: '#16161b' }, { t: 'chair', x: -9.9, z: -0.5, r: Math.PI / 2, c: '#3a3d45' }, { t: 'chair', x: -8.1, z: -0.5, r: -Math.PI / 2, c: '#3a3d45' },
    { t: 'skywin', x: -5.5, z: -7.94, r: 0 }, { t: 'skywin', x: -1.5, z: -7.94, r: 0 }, { t: 'skywin', x: 2.5, z: -7.94, r: 0 }, { t: 'skywin', x: 6.8, z: -7.94, r: 0 },
    { t: 'tv', x: -1.5, z: -7.3, r: 0 }, { t: 'rug', x: -1.5, z: -4.4, r: 0, c: '#e8e2d6' }, { t: 'couch', x: -1.5, z: -2.4, r: Math.PI, c: '#3a3d45' }, { t: 'armchair', x: -4.2, z: -4.4, r: Math.PI / 2, c: '#8b1e3f' }, { t: 'armchair', x: 1.2, z: -4.4, r: -Math.PI / 2, c: '#8b1e3f' },
    { t: 'piano', x: 2.8, z: 4.6, r: 0 }, { t: 'aquarium', x: -11.6, z: 3, r: Math.PI / 2 }, { t: 'hottub', x: -8.8, z: 5.6, r: 0, c: '#3a3d45' }, { t: 'plant', x: -11.3, z: -2.4, r: 0 }, { t: 'plant', x: 4.3, z: -7.4, r: 0 }, { t: 'stereo', x: -4.4, z: -7.6, r: 0 }, { t: 'lamp', x: 0.6, z: -6.9, r: 0 },
    { t: 'bookshelf', x: 4.6, z: -4, r: -Math.PI / 2 }, { t: 'bed', x: 9.8, z: -1.4, r: 0, c: '#e8e2d6' }, { t: 'desk', x: 6.4, z: -7.4, r: 0, c: '#3a3d45' }, { t: 'armchair', x: 11, z: 6.6, r: -2.4, c: '#3a3d45' }, { t: 'plant', x: 11.4, z: 2.6, r: 0 },
    { t: 'tub', x: 10.2, z: -7.4, r: 0 }, { t: 'shower', x: 11.4, z: -4.1, r: -Math.PI / 2 }, { t: 'toilet', x: 9.1, z: -4.6, r: Math.PI / 2, c: '#f4f6f8' }],
  villa: [{ t: 'fridge', x: -10.3, z: -6.5, r: 0 }, { t: 'stove', x: -9.1, z: -6.5, r: 0 }, { t: 'island', x: -8.2, z: -4.4, r: 0, c: '#e8e2d6' }, { t: 'stool', x: -8.8, z: -3.4, r: Math.PI }, { t: 'stool', x: -7.6, z: -3.4, r: Math.PI },
    { t: 'table', x: -8.5, z: 0.8, r: 0 }, { t: 'chair', x: -9.4, z: 0.8, r: Math.PI / 2 }, { t: 'chair', x: -7.6, z: 0.8, r: -Math.PI / 2 },
    { t: 'skywin', x: -5, z: -6.94, r: 0 }, { t: 'skywin', x: 1.5, z: -6.94, r: 0 }, { t: 'tv', x: -1.5, z: -6.4, r: 0 }, { t: 'rug', x: -1.5, z: -3.6, r: 0, c: '#c2b280' }, { t: 'couch', x: -1.5, z: -1.8, r: Math.PI, c: '#c2b280' }, { t: 'armchair', x: -4.2, z: -3.6, r: Math.PI / 2, c: '#5a6b7a' },
    { t: 'bookshelf', x: 2.6, z: -6.6, r: 0 }, { t: 'stereo', x: -4.2, z: -6.6, r: 0 }, { t: 'hottub', x: -8.6, z: 4.8, r: 0 }, { t: 'plant', x: -10.4, z: -1.8, r: 0 }, { t: 'plant', x: 4.3, z: -6.4, r: 0 }, { t: 'palm', x: 3.6, z: 5.8, r: 0 },
    { t: 'bed', x: 9.6, z: -0.9, r: 0, c: '#3a5fa0' }, { t: 'desk', x: 6.2, z: -6.5, r: 0 }, { t: 'armchair', x: 10.2, z: 5.6, r: -2.4, c: '#c2b280' },
    { t: 'tub', x: 9.6, z: -6.4, r: 0 }, { t: 'shower', x: 10.4, z: -3.8, r: -Math.PI / 2 }, { t: 'toilet', x: 8.9, z: -4.4, r: Math.PI / 2, c: '#f4f6f8' }],
  mansion: [{ t: 'fridge', x: -12.3, z: -8.5, r: 0 }, { t: 'stove', x: -11.1, z: -8.5, r: 0 }, { t: 'stove', x: -9.9, z: -8.5, r: 0 }, { t: 'barcart', x: -7.3, z: -8.6, r: 0 }, { t: 'island', x: -10, z: -5.8, r: 0, c: '#e8e2d6' }, { t: 'stool', x: -10.6, z: -4.8, r: Math.PI }, { t: 'stool', x: -9.4, z: -4.8, r: Math.PI },
    { t: 'table', x: -10, z: -1.6, r: 0 }, { t: 'chair', x: -10.9, z: -1.6, r: Math.PI / 2 }, { t: 'chair', x: -9.1, z: -1.6, r: -Math.PI / 2 }, { t: 'chair', x: -10, z: -2.5, r: 0 }, { t: 'chair', x: -10, z: -0.7, r: Math.PI },
    { t: 'skywin', x: -4, z: -8.94, r: 0 }, { t: 'skywin', x: 0, z: -8.94, r: 0 }, { t: 'skywin', x: 4, z: -8.94, r: 0 }, { t: 'skywin', x: 7.8, z: -8.94, r: 0 },
    { t: 'tv', x: 0, z: -8.3, r: 0 }, { t: 'rug', x: 0, z: -5.4, r: 0, c: '#8b1e3f' }, { t: 'couch', x: 0, z: -3.3, r: Math.PI, c: '#e8e2d6' }, { t: 'couch', x: -3, z: -5.6, r: Math.PI / 2, c: '#e8e2d6' }, { t: 'armchair', x: 2.7, z: -5.6, r: -Math.PI / 2, c: '#8b1e3f' },
    { t: 'piano', x: 3.8, z: 5.6, r: 0, c: '#ffffff' }, { t: 'aquarium', x: 5.4, z: -1.5, r: -Math.PI / 2 }, { t: 'hottub', x: -3.6, z: 6.2, r: 0 }, { t: 'weights', x: -11.5, z: 6.6, r: 0 }, { t: 'treadmill', x: -8.6, z: 6.6, r: 0 }, { t: 'arcade', x: -12.4, z: 2.4, r: Math.PI / 2 },
    { t: 'stereo', x: -4, z: -8.6, r: 0 }, { t: 'plant', x: -12.3, z: -3.6, r: 0 }, { t: 'palm', x: 5.2, z: 8, r: 0 }, { t: 'palm', x: -6.4, z: 8, r: 0 }, { t: 'lamp', x: 2.4, z: -8.2, r: 0 },
    { t: 'bed', x: 11.2, z: -2, r: 0, c: '#a03a4f' }, { t: 'desk', x: 7.6, z: -8.4, r: 0 }, { t: 'bookshelf', x: 6.4, z: 5, r: Math.PI / 2 }, { t: 'armchair', x: 12.2, z: 7.6, r: -2.4 }, { t: 'plant', x: 12.4, z: 1.2, r: 0 },
    { t: 'tub', x: 11.4, z: -8.4, r: 0 }, { t: 'shower', x: 12.3, z: -4.8, r: -Math.PI / 2 }, { t: 'toilet', x: 10.1, z: -5.2, r: Math.PI / 2, c: '#f4f6f8' }],
  house: [{ t: 'fridge', x: -8.4, z: -5.5, r: 0 }, { t: 'stove', x: -7.3, z: -5.5, r: 0 }, { t: 'table', x: -5.4, z: -4.2, r: 0 }, { t: 'tv', x: -8.6, z: 2.6, r: Math.PI / 2 }, { t: 'couch', x: -5.4, z: 2.6, r: -Math.PI / 2, c: '#5a6b7a' }, { t: 'plant', x: 3.4, z: -5.5, r: 0 }, { t: 'bed', x: 6.8, z: 2.8, r: 0, c: '#a03a4f' }, { t: 'shower', x: 8.3, z: -5.3, r: 0 }, { t: 'toilet', x: 6.9, z: -5.5, r: 0, c: '#f4f6f8' }],
};
export const STARTER_FURNITURE = [{ t: 'single', x: -3, z: -2.2, r: 0, c: '#3a5fa0' }, { t: 'fridge', x: 3.6, z: -3.4, r: 0 }, { t: 'plant', x: 4.2, z: 2.6, r: 0 }, { t: 'armchair', x: 0.5, z: -2.6, r: 0 }];

const MAT = new Map();
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MAT.has(k)) MAT.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o })); return MAT.get(k); };
function box(g, w, h, d, c, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y + h / 2, z); m.receiveShadow = true; m.castShadow = true; g.add(m); return m; }

// Build a room. furniture: [{t,x,z,r,c}] (homes). Returns handle with dispose().
export function buildInterior(id, furniture = null, carCfgs = []) {
  const tpl = INTERIORS[id], g = new THREE.Group(), cols = [];
  g.position.set(ORIGIN.x, 0, ORIGIN.z);
  const { w, d } = tpl, H = 3.2, t = 0.3;
  const floor = box(g, w, 0.1, d, tpl.floor, 0, -0.1, 0); floor.castShadow = false;
  // floor pattern
  for (let i = 0; i < w / 2; i++) for (let j = 0; j < d / 2; j++) if ((i + j) % 2 === 0) { const q = box(g, 1.98, 0.01, 1.98, new THREE.Color(tpl.floor).multiplyScalar(0.92).getStyle(), -w / 2 + 1 + i * 2, 0, -d / 2 + 1 + j * 2); q.castShadow = false; }
  const wallC = tpl.wall, trim = new THREE.Color(tpl.wall).multiplyScalar(0.7).getStyle();
  box(g, w + t * 2, H, t, wallC, 0, 0, -d / 2 - t / 2);                       // north
  box(g, t, H, d + t, wallC, -w / 2 - t / 2, 0, 0); box(g, t, H, d + t, wallC, w / 2 + t / 2, 0, 0); // west/east
  box(g, w + t * 2, 0.12, t + 0.02, trim, 0, H - 0.12, -d / 2 - t / 2);
  const dw = 2.4; // south: low cutaway wall with door gap
  for (const s of [-1, 1]) box(g, (w - dw) / 2 + t, 0.5, t, trim, s * ((w - dw) / 4 + dw / 2 + t / 2), 0, d / 2 + t / 2);
  box(g, dw, 0.02, 1.2, '#3a2a1a', 0, 0, d / 2 - 0.3); // door mat
  // outside: sidewalk, kerb and road so the view past the cutaway isn't a void
  const out = (ww, dd, c, x, z, y = -0.12) => { const m = box(g, ww, 0.1, dd, c, x, y, z); m.castShadow = false; return m; };
  out(w + 40, 5, '#b9b4ad', 0, d / 2 + t + 2.5);
  for (let i = -w / 2 - 20; i < w / 2 + 20; i += 2.5) out(0.06, 5, '#a29d96', i, d / 2 + t + 2.5, -0.115);
  out(w + 40, 0.3, '#d8d2c8', 0, d / 2 + t + 5.15, -0.06);
  out(w + 40, 30, '#3d3d44', 0, d / 2 + t + 20.3, -0.16);
  for (let i = -w / 2 - 18; i < w / 2 + 20; i += 6) out(3, 0.25, '#e8e2c8', i, d / 2 + t + 11, -0.1);
  out(w + 40, 30, '#2a2a30', 0, -d / 2 - 15, -0.16); out(20, d + 2, '#2a2a30', -w / 2 - 10.3, 0, -0.16); out(20, d + 2, '#2a2a30', w / 2 + 10.3, 0, -0.16);
  const wc = (x0, z0, x1, z1) => ({ x0: ORIGIN.x + x0, z0: ORIGIN.z + z0, x1: ORIGIN.x + x1, z1: ORIGIN.z + z1, h: 9 });
  cols.push(wc(-w / 2 - 1, -d / 2 - 1, w / 2 + 1, -d / 2), wc(-w / 2 - 1, -d / 2, -w / 2, d / 2 + 1), wc(w / 2, -d / 2, w / 2 + 1, d / 2 + 1), wc(-w / 2, d / 2, -dw / 2, d / 2 + 1), wc(dw / 2, d / 2, w / 2, d / 2 + 1));
  // ---- big multi-room interiors: coloured floor zones, internal walls, upper decks and stairs
  const upper = [];  // meshes on the upper floor, faded out while you're downstairs so you can see under them
  for (const [x0, z0, x1, z1, c] of tpl.floors || []) { const m = box(g, x1 - x0, 0.02, z1 - z0, c, (x0 + x1) / 2, 0.002, (z0 + z1) / 2); m.castShadow = false; }
  const iwalls = []; // inner walls go see-through when you're standing just behind one (camera looks from the south)
  for (const [x0, z0, x1, z1, hh = 3, c] of tpl.walls || []) { const wm = box(g, Math.max(0.3, x1 - x0), hh, Math.max(0.3, z1 - z0), c || wallC, (x0 + x1) / 2, 0, (z0 + z1) / 2); wm.material = new THREE.MeshStandardMaterial({ color: c || wallC, roughness: 0.85, transparent: true, opacity: 1 }); iwalls.push({ m: wm, x0: ORIGIN.x + x0, x1: ORIGIN.x + Math.max(x1, x0 + 0.3), z: ORIGIN.z + (z0 + z1) / 2, hh, o: 1 }); cols.push(wc(x0, z0, Math.max(x1, x0 + 0.3), Math.max(z1, z0 + 0.3))); cols[cols.length - 1].h = hh; }
  const fadeMat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, transparent: true, opacity: 1 });
  for (const D of tpl.decks || []) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(D.x1 - D.x0, 0.25, D.z1 - D.z0), fadeMat('#8a8e96')); slab.position.set((D.x0 + D.x1) / 2, D.y - 0.125, (D.z0 + D.z1) / 2); slab.receiveShadow = true; g.add(slab); upper.push(slab);
    if (D.rail) for (const [a, b] of D.rail) { const r = new THREE.Mesh(new THREE.BoxGeometry(b - a, 1.0, 0.08), fadeMat('#5a5d64')); r.position.set((a + b) / 2, D.y + 0.5, D.z1 - 0.05); g.add(r); upper.push(r); const c = wc(a, D.z1 - 0.15, b, D.z1 + 0.05); c.upper = true; c.h = D.y + 1.2; cols.push(c); }
    for (const [x, z] of D.posts || []) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, D.y, 0.3), mat('#6a6d74')); p.position.set(x, D.y / 2, z); g.add(p); cols.push(wc(x - 0.15, z - 0.15, x + 0.15, z + 0.15)); }
  }
  for (const R of tpl.ramps || []) { // stairs: a sloped slab with steps on top
    const len = R.z1 - R.z0, rise = R.y1 - R.y0, n = Math.ceil(len / 0.45);
    for (let i = 0; i < n; i++) { const t0 = i / n, st = new THREE.Mesh(new THREE.BoxGeometry(R.x1 - R.x0, 0.12, len / n + 0.02), fadeMat('#9aa0aa')); st.position.set((R.x0 + R.x1) / 2, R.y0 + rise * (t0 + 0.5 / n) - 0.06, R.z0 + len * (t0 + 0.5 / n)); g.add(st); upper.push(st); }
    for (const sx of [R.x0, R.x1]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, Math.hypot(len, rise)), fadeMat('#5a5d64')); rl.position.set(sx, (R.y0 + R.y1) / 2 + 0.9, (R.z0 + R.z1) / 2); rl.rotation.x = Math.atan2(rise, len) * (R.y1 > R.y0 ? -1 : 1); g.add(rl); upper.push(rl); }
  }
  const floorY = (x, z, yFeet) => {
    const lx = x - ORIGIN.x, lz = z - ORIGIN.z; let y = 0;
    for (const D of tpl.decks || []) if (lx > D.x0 && lx < D.x1 && lz > D.z0 && lz < D.z1 && yFeet >= D.y - 0.8) y = Math.max(y, D.y);
    for (const R of tpl.ramps || []) if (lx > R.x0 && lx < R.x1 && lz > R.z0 - 0.3 && lz < R.z1 + 0.3) { const t = Math.min(1, Math.max(0, (lz - R.z0) / (R.z1 - R.z0))), ry = R.y0 + (R.y1 - R.y0) * t; if (yFeet >= ry - 0.9) y = Math.max(y, ry); }
    return y;
  };
  // lights
  const lc = tpl.light || '#fff1dc';
  for (const [x, z] of tpl.lights || (w > 30 ? [[-w / 3, -d / 4], [0, -d / 4], [w / 3, -d / 4], [-w / 3, d / 4], [0, d / 4], [w / 3, d / 4]] : [[-w / 4, -d / 6], [w / 4, -d / 6], [0, d / 4]])) { const l = new THREE.PointLight(lc, tpl.dark ? 12 : 18, Math.max(w, d) * 1.1, 1.4); l.position.set(x, H - 0.3, z); g.add(l); }
  // fixtures
  const furn = [];
  const place = (t, x, z, r = 0, c, y = 0) => {
    const f = FURN[t]; if (!f) return null;
    const m = buildFurn(t, c); m.position.set(x, y, z); m.rotation.y = r; g.add(m);
    if (y > 1) { m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; upper.push(o); } }); }
    const item = { t, x, z, r, c, mesh: m, col: null };
    if (t === 'cellbars') { // bars with an open doorway in the middle: collide only on either side of it
      const ax = Math.abs(Math.cos(r)) > 0.5; item.cols = [-1, 1].map(sd => { const a = sd * 0.95, hw = 0.47; return ax ? { x0: ORIGIN.x + x + a - hw, x1: ORIGIN.x + x + a + hw, z0: ORIGIN.z + z - 0.1, z1: ORIGIN.z + z + 0.1, h: 2.5 } : { x0: ORIGIN.x + x - 0.1, x1: ORIGIN.x + x + 0.1, z0: ORIGIN.z + z + a - hw, z1: ORIGIN.z + z + a + hw, h: 2.5 }; }); if (y > 1) item.cols.forEach(c => { c.upper = true; c.h = y + 2.6; }); item.cols.forEach(addCollider);
    } else if (!f.flat && t !== 'lane' && t !== 'sign' && t !== 'painting') { const sw = Math.abs(Math.cos(r)) > 0.5 ? f.w : f.d, sd = Math.abs(Math.cos(r)) > 0.5 ? f.d : f.w; item.col = { x0: ORIGIN.x + x - sw / 2, x1: ORIGIN.x + x + sw / 2, z0: ORIGIN.z + z - sd / 2, z1: ORIGIN.z + z + sd / 2, h: y > 1 ? y + 2.6 : 2.5, upper: y > 1 }; addCollider(item.col); }
    furn.push(item); return item;
  };
  for (const [t, x, z, r, c, y] of tpl.items) place(t, x, z, r, c, y);
  if (furniture) for (const f of furniture) place(f.t, f.x, f.z, f.r, f.c);
  // showroom cars
  const cars = [];
  if (tpl.cars) tpl.cars.forEach(([x, z], i) => { if (!carCfgs[i]) return; const c = buildCar(carCfgs[i]); c.group.position.set(x, 0.15, z); c.group.rotation.y = 0.6 - i * 0.6; g.add(c.group); cars.push(c); const col = { x0: ORIGIN.x + x - 2.6, x1: ORIGIN.x + x + 2.6, z0: ORIGIN.z + z - 2.6, z1: ORIGIN.z + z + 2.6, h: 2 }; cols.push(col); });
  for (const c of cols) addCollider(c);
  return {
    id, tpl, group: g, furn, cars, w, d, floorY, upper,
    seeThrough(px, pz, py = 0) { for (const W of iwalls) { const dz = W.z - pz, o = px > W.x0 - 0.8 && px < W.x1 + 0.8 && dz > 0 && dz < W.hh * 1.4 + 0.6 && py < W.hh ? 0.22 : 1; if (o !== W.o) { W.o = o; W.m.material.opacity = o; W.m.material.depthWrite = o > 0.9; W.m.castShadow = o > 0.9; } } },
    fadeUpper(o) { for (const m of upper) { m.material.opacity = o; m.material.depthWrite = o > 0.9; } },
    toWorld: (x, z) => ({ x: ORIGIN.x + x, z: ORIGIN.z + z }),
    inside: (x, z, m = 0.4) => Math.abs(x - ORIGIN.x) < w / 2 - m && z - ORIGIN.z > -d / 2 + m && z - ORIGIN.z < d / 2 + 0.9,
    place,
    remove(item) { if (item.col) removeCollider(item.col); g.remove(item.mesh); furn.splice(furn.indexOf(item), 1); },
    move(item, x, z, r) { if (item.col) removeCollider(item.col); g.remove(item.mesh); furn.splice(furn.indexOf(item), 1); return place(item.t, x, z, r, item.c); },
    dispose() { for (const c of cols) removeCollider(c); for (const f of furn) { if (f.col) removeCollider(f.col); if (f.cols) f.cols.forEach(removeCollider); } g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); },
  };
}
