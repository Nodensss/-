import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { PAIR_321, PAIR_315, forecast, calculateRate, twoMeasurementRate, type LevelSample } from './index';
// CSV без кавычек в значениях: только условные имена, числа и пустые поля.
function readCsv(name: string): Record<string,string>[] {
  const [header,...lines] = readFileSync(new URL(`../asutp/test-vectors/${name}`,import.meta.url),'utf8').trim().split(/\r?\n/).map(line => line.split(','));
  return lines.map(values => Object.fromEntries(header.map((key,i) => [key,values[i]])));
}
const config = (id: string) => id === '321-323' ? PAIR_321 : PAIR_315;
const now = new Date(2026,10,3,8,0).getTime();
for (const row of readCsv('forecasts.csv')) it(`CSV ${row.case}: прогноз`, () => {
  const r = forecast({...config(row.pair),feedMax:row.feed_max===''?null:+row.feed_max}, {
    sourceLevelMm:+row.source_mm,feedLevel:+row.feed_level,ratePerHour:+row.rate,targetMm:+row.target_mm,batchMm:+row.batch_mm,now });
  for (const [field,key] of [['hoursBefore','h0'],['sourceMm','x_src'],['addedFeed','add_feed'],['finalLevel','l_fin'],['usefulAfter','u1'],['hoursAfter','h1'],['batchHours','h_batch'],['sourceMinNoOverfillMm','src_min']] as const) {
    if(row[key]==='') expect(r[field]).toBeNull(); else expect(r[field]).toBeCloseTo(+row[key],8);
  }
  expect(r.status).toBe(+row.status);expect(r.overfill).toBe(row.overfill==='1');
});
const samples=readCsv('samples.csv');
for (const row of readCsv('rates.csv')) it(`CSV ${row.case}: история`, () => {
  const history:LevelSample[]=samples.filter(s=>s.case===row.samples).map(s=>({at:now+(+s.minute-(+row.now_minute))*60000,level:+s.feed_level,ok:s.ok_feed==='1',transferOn:s.transfer_on==='1'}));
  const r=calculateRate(config(row.pair),{samples:history,now,lastGood:row.last_rate===''?null:{ratePerHour:+row.last_rate,at:now-(+row.last_age_min)*60000}});
  expect(r.state).toBe(+row.state);expect(r.usedMin).toBe(+row.used_min);expect(r.excludedMin).toBe(+row.excluded_min);
  if(row.expected_rate==='')expect(r.ratePerHour).toBeNull();else expect(r.ratePerHour).toBeCloseTo(+row.expected_rate,8);
});
for(const row of readCsv('measurements.csv')) it(`CSV ${row.case}: два замера`,()=>expect(twoMeasurementRate(config(row.pair),+row.earlier,+row.current,+row.elapsed_min,+row.transferred_mm)).toBeCloseTo(+row.expected_rate,8));
