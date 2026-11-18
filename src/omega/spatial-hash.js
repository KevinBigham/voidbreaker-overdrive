import { distSq, pointToSegmentDistSq } from './math';
/**
 * High-speed 2D Spatial Hash Grid for broad-phase collision detection
 * across hundreds of swarm drones, projectiles, and railgun beams.
 */
export class SpatialHashGrid {
    cellSize;
    cells = new Map();
    constructor(cellSize = 110) {
        this.cellSize = cellSize;
    }
    clear() {
        this.cells.clear();
    }
    key(cx, cy) {
        return `${cx},${cy}`;
    }
    insert(entity) {
        const r = entity.radius;
        const minX = Math.floor((entity.pos.x - r) / this.cellSize);
        const maxX = Math.floor((entity.pos.x + r) / this.cellSize);
        const minY = Math.floor((entity.pos.y - r) / this.cellSize);
        const maxY = Math.floor((entity.pos.y + r) / this.cellSize);
        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                const k = this.key(cx, cy);
                let bucket = this.cells.get(k);
                if (!bucket) {
                    bucket = [];
                    this.cells.set(k, bucket);
                }
                bucket.push(entity);
            }
        }
    }
    queryRadius(center, radius) {
        const minX = Math.floor((center.x - radius) / this.cellSize);
        const maxX = Math.floor((center.x + radius) / this.cellSize);
        const minY = Math.floor((center.y - radius) / this.cellSize);
        const maxY = Math.floor((center.y + radius) / this.cellSize);
        const seen = new Set();
        const results = [];
        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                const bucket = this.cells.get(this.key(cx, cy));
                if (!bucket)
                    continue;
                for (const item of bucket) {
                    if (seen.has(item.id))
                        continue;
                    seen.add(item.id);
                    const maxR = radius + item.radius;
                    if (distSq(center, item.pos) <= maxR * maxR) {
                        results.push(item);
                    }
                }
            }
        }
        return results;
    }
    querySegment(a, b, beamRadius) {
        const minX = Math.floor((Math.min(a.x, b.x) - beamRadius - 60) / this.cellSize);
        const maxX = Math.floor((Math.max(a.x, b.x) + beamRadius + 60) / this.cellSize);
        const minY = Math.floor((Math.min(a.y, b.y) - beamRadius - 60) / this.cellSize);
        const maxY = Math.floor((Math.max(a.y, b.y) + beamRadius + 60) / this.cellSize);
        const seen = new Set();
        const results = [];
        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                const bucket = this.cells.get(this.key(cx, cy));
                if (!bucket)
                    continue;
                for (const item of bucket) {
                    if (seen.has(item.id))
                        continue;
                    seen.add(item.id);
                    const totalR = beamRadius + item.radius;
                    const seg = pointToSegmentDistSq(item.pos, a, b);
                    if (seg.distSq <= totalR * totalR) {
                        results.push(item);
                    }
                }
            }
        }
        return results;
    }
}
