import { from, of } from 'rxjs';

const Genie = {
  agent: () => from(import("./agent")),
  sound: () => from(import("./sounds-ogg")),
  map: () => of(new URL('./map.png', import.meta.url).href),
};
export default Genie;

