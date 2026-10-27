import { test, expect } from '@playwright/test';
import { cameraTarget, outsideWorld, supportedBodies } from '../src/game/systems/rules';

test('只沿著盤子的承重接觸鏈計分，忽略擦邊及懸空群組', () => {
  const plate = { id: 0, y: 750 };
  const bodies = [{ id: 1, y: 710 }, { id: 2, y: 650 }, { id: 3, y: 610 }, { id: 4, y: 560 }];
  const contact = (a: number, b: number, normalY = 1) => ({ a, b, normalY });
  expect([...supportedBodies(plate, bodies, [contact(0, 1), contact(1, 2), contact(3, 4)])]).toEqual([0, 1, 2]);
  expect([...supportedBodies(plate, bodies, [contact(0, 1, 0.1), contact(1, 2)])]).toEqual([0]);
  expect([...supportedBodies(plate, bodies, [])]).toEqual([0]);
});

test('失敗線不受鏡頭升高影響，鏡頭不向下超出初始位置', () => {
  const margins = { left: -90, right: 480, bottom: 125 };
  expect(outsideWorld(195, 750, 750, margins)).toBe(false);
  expect(outsideWorld(195, -1400, 750, margins)).toBe(false);
  expect(outsideWorld(195, 876, 750, margins)).toBe(true);
  expect(outsideWorld(-91, -1400, 750, margins)).toBe(true);
  expect(cameraTarget(740, 470)).toBe(0);
  expect(cameraTarget(-800, 470)).toBe(-1270);
});
test('短暫擦過平台但重心已在支撐面外，不算有效堆疊', () => {
  expect([...supportedBodies({ id: 0, y: 750, minX: 87, maxX: 303 },
    [{ id: 1, y: 710, x: 319 }], [{ a: 0, b: 1, normalY: 1 }])]).toEqual([0]);
});