import { hyphenateSync } from 'hyphen/en';

class Box {
  /**
  A box refers to something that is to be typeset: either a character from some font
  of type, or a black rectangle such as a horizontal or vertical rule, or something
  built up from several characters such as an accented letter or a mathematical
  formula. The contents of a box may be extremely complicated, or they may be
  extremely simple; the line-breaking algorithm does not peek inside a box to see
  what it contains, so we may consider the boxes to be sealed and locked. As far as
  we are concerned, the only relevant thing about a box is its width: When item x_i of
  a paragraph specifies a box, the width of that box is a real number w_i representing
  the amount of space that the box will occupy on a line. The width of a box may be
  zero, and in fact it may also be negative, although negative widths must be used
  with care and understanding according to the precise rules laid down below.
   */
  width: number;
  type: string;
  penalty: number;
  flagged: number;
  content: string;
  constructor(width: number, content: string) {
    this.width = width;
    this.type = 'box';
    this.penalty = 0;
    this.flagged = 0;
    this.content = content;
  }

  toString() {
    return this.content;
  }
}

class Glue {
  /*
    Glue refers to blank space that can vary its width in specified ways; it is an elastic
    mortar used between boxes in a typeset line. When item x_i of a paragraph specifies glue, 
    there are three real numbers (w_i, y_i, z_i) of importance to the line-breaking algorithm:
  */
  /** the 'ideal' or 'normal' width */
  width: number;
  /**  the 'stretchability' (y) */
  stretchability: number;
  /** the 'shrinkability' (z) */
  shrinkability: number;
  type: string;
  penalty: number;
  flagged: number;
  constructor(w: number, y: number, z: number) {
    this.width = w;
    this.stretchability = y;
    this.shrinkability = z;
    this.type = 'glue';
    this.penalty = 0;
    this.flagged = 0;
  }

  toString() {
    return ' ';
  }
}

class Penalty {
  /*
  Penalty specifications also have widths w_i, with the
  following meaning: If a line break occurs at this place in the paragraph, additional
  typeset material of width wi will be added to the line just before the break occurs.
  For example, a potential place at which a word might be hyphenated would be
  indicated by letting p i be the penalty for hyphenating there and letting wi be
  the width of the hyphen. Penalty specifications are of two kinds, flagged and
  unflagged, denoted by f_i = 1 and f_i = 0.
  */
  width: number;
  penalty: number;
  flagged: number;
  type: string;
  constructor(width: number, penalty: number, flagged: number) {
    this.width = width;
    this.penalty = penalty;
    this.flagged = flagged;
    this.type = 'penalty';
  }

  toString() {
    return '';
  }
}

type ParagraphSequenceElement = Box | Glue | Penalty;
class Paragraph {
  /*
  A paragraph is a sequence x_1, x_2, ... x_m of m items, where each individual 
  item x_i is either a box specification, a glue specification, or a
  penalty specification.
  */
  body: Array<ParagraphSequenceElement>
  constructor() {
    this.body = [];
  }

  build(text: any) {
    if (!(text instanceof String))
      throw ("Only text is allowed as an argument!");
    /*
    A typesetting system like TEX will put such an actual paragraph into the abstract form
    we want in the following way:

      (1) If the paragraph is to be indented, the first item x_1 will be an empty box whose
          width is the amount of indentation
      (2) Each word of the paragraph becomes a sequence of boxes for the characters of the
          word, including punctuation marks that belong with that word. The widths w_i
          are determined by the fonts of type being used. Flagged penalty items are inserted
          into these words wherever an acceptable hyphenation could be used to divide a
          word at the end of a line.
      (3) There is glue between words, corresponding to the recommended spacing conven-
          tions of the fonts of type in use
      (4) Explicit hyphens and dashes in the text will be followed by flagged penalty items
          having width zero. This specifies a permissible line break after a hyphen or a
          dash. Some style conventions also allow breaks before em-dashes, in which case
          an unflagged width-zero penalty would precede the dash
      (5) At the very end of a paragraph, two items are appended so that the final line
          will be treated properly. First comes a glue item x_{m-1} that specifies the white
          space allowable at the right of the last line; then comes a penalty item x_m with
          p_m = -\infty to force a break at the paragraph end. TEX ordinarily uses a 'finishing
          glue' with w_{m-1} = 0, y_{m-l} = \infty, and z_{m-1} = 0; thus the normal space at 
          the end of a paragraph is zero but it can stretch a great deal
    */
    // add indentation?
    // this.body.push(new Box(2, '  '));
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== ' ') {
        // treat words as boxes for now, because inter-character spacing seems tricky in the DOM
        let word = text[i++];
        while (text[i] !== ' ' && i < text.length) word += text[i++];
        this.body.push(new Box(word.length, word));
        i--;
      } else {
        this.body.push(new Glue(1, 1, 1));
      }
    }
    // (5)
    this.body.push(new Glue(0, Infinity, 0));
    this.body.push(new Penalty(0, -Infinity, 0));
  }
}
class NetworkNode {
  /*
  An 'active node' in this description refers to a record that includes information about a
  breakpoint together with its fitness classification and the line number on which it ends 
  */
  // index of breakpoint represented by this node (0 = start of paragraph)
  position: number;
  // number of the line ending at this breakpoint
  line: number;
  // fitness class of the line ending at this breakpoint
  fitness: number;
  // sum(w)_after(this)
  totalwidth: number;
  // sum(y)_after(this)
  totalstretch: number;
  // sum(z)_after)this
  totalshrink: number;
  // minimum total demerits up to this breakpoint
  totaldemerits: number;
  // pointer to the best node for the preceding breakpoint
  previous: NetworkNode;
  // pointer to the next node in the list
  link: NetworkNode;
  active: boolean;
  /** total stretch ratio */
  ratio: number;

  constructor(
    position: number,
    line: number,
    fitness: number,
    totalwidth: number,
    totalstretch: number,
    totalshrink: number,
    totaldemerits: number,
    previous: NetworkNode,
    link: NetworkNode,
    ratio: number) {
    this.position = position;
    this.line = line;
    this.fitness = fitness;
    this.totalwidth = totalwidth;
    this.totalstretch = totalstretch;
    this.totalshrink = totalshrink;
    this.totaldemerits = totaldemerits;
    this.previous = previous;
    this.link = link;
    this.active = true;
    this.ratio = ratio;
  }

  deactivate(prev_a: NetworkNode, active_list: NetworkNode, next_a: NetworkNode, passive_list: NetworkNode) {
    /* deactivate this node */
    if (prev_a = null) {
      active_list = next_a;
    } else {
      prev_a.link = next_a;
    }
    this.link = passive_list;
    passive_list = this;
    this.active = false;
  }
}

class Break {
  active_list: NetworkNode;
  passive_list: NetworkNode;
  text: string;
  paragraph: Paragraph;
  sum_w: number;
  sum_y: number;
  sum_z: number;
  // threshold parameter: upper bound
  // on adjustment ratios
  roh: number;
  // looseness parameter
  q: number;
  // added to demerits whenever there are
  // two consecutive breakpoints with f_1 = 1
  alpha: number;
  // added to demerits whever two consecutive
  // lines belong to incompatible fitness classes
  gamma: number;
  // list of line lengths
  lines_array: Array<number>;


  constructor() {
    // some sane defaults
    this.q = 0;
    this.roh = 5;
    this.alpha = 0;
    this.gamma = 0;
  }

  lines(i: number): number {
    if (i > this.lines_array.length - 1)
      return this.lines_array[this.lines_array.length - 1];
    return this.lines_array[i];
  }

  break(paragraph: Paragraph, lines_array: Array<number>): { breakpoints: Array<number>, ratios: Array<number> } {

    this.paragraph = paragraph;
    this.lines_array = lines_array;

    // DONE: create an active node representing the beginning of the paragraph
    this.active_list = new NetworkNode(0, 0, 1, 0, 0, 0, 0, null, null, undefined);
    this.passive_list = null;

    this.sum_w = 0;
    this.sum_y = 0;
    this.sum_z = 0;
    let par = this.paragraph.body;
    for (let b = 0; b < par.length; b++) {
      if (par[b].type === 'box') {
        this.sum_w += par[b].width;
      } else if (par[b].type === 'glue') {
        if (b > 0 && par[b - 1].type === 'box') {
          // TODO: main loop
          // BEGIN main loop:
          this.mainLoop(b);
          // END main loop
        }
        this.sum_w += par[b].width;
        this.sum_y += (par[b] as Glue).stretchability;
        this.sum_z += (par[b] as Glue).shrinkability;
      } else if (par[b].penalty !== Infinity) {
        // TODO: main loop
        // BEGIN: main loop
        this.mainLoop(b);
        // END: main loop
        //console.log("Hit unimplemented second loop")
      }
    }
    // TODO: choose the active node with fewest total demerits
    // BEGIN: choose the active node with fewest total demerits
    let [chosen, linenumber] = this.chooseNodeFewestDemerits();
    // END: choose the active node with fewest total demerits
    if (this.q !== 0) {
      // TODO: choose the appropiate active node
      // BEGIN: choose the appropiate active node
      [chosen, linenumber] = this.chooseAppropriateActiveNode(linenumber, chosen);
      // END: choose the appropiate active node
    }
    // TODO: use the chosen node to determine the optimal breakpoint sequence
    // BEGIN: use the chosen node to determine the optimal breakpoint sequence
    let breakpoints: Array<number> = Array(linenumber + 1);
    let ratios: Array<number> = Array(linenumber + 1);
    ratios[0] = undefined;
    for (let j = linenumber; j >= 0; j--) {
      // DEBUG   
      if (j < linenumber && DEBUG) {
        let closest_box_before_break: number = 0;
        for (let k = chosen.position; k >= 0; k--) {
          if (this.paragraph.body[k].type === 'box') {
            closest_box_before_break = k;
            break;
          }
        }
        console.log(`[LINE] (${j})\tratio: ${chosen.previous ? chosen.previous.ratio : ' '}, node: ${this.paragraph.body[closest_box_before_break].toString()}`);
      }

      breakpoints[j] = chosen.position;
      chosen = chosen.previous;
      ratios[j] = chosen ? chosen.ratio : undefined;
    }
    // END: use the chosen node to determine the optimal breakpoint sequence
    return { breakpoints: breakpoints, ratios: ratios };
  }

  mainLoop(b: number) {
    let par = this.paragraph.body;
    let a = this.active_list;
    let prev_a = null;
    let Ac: Array<NetworkNode> = [null, null, null, null];
    let D, Dmax;
    while (true) {
      D = [Infinity, Infinity, Infinity, Infinity];
      Dmax = Infinity;
      let next_a;
      while (true) {
        next_a = a.link;
        // TODO: compute adjustment ratio r from a to b
        // BEGIN: adj ratio from a to b (a, par, lines) -> (r, j)
        let [j, r] = this.computeAdjustmentRatio(par, a, b);
        // END: adj ratio r from a to b
        if (r < -1 || par[b].penalty === -Infinity) {
          // TODO: deactivate node a
          // BEGIN: deactivate node a
          r = this.deactivateNode(a, prev_a, next_a, Dmax, r);
          // END: deactivate node a
        } else {
          prev_a = a;
        }
        if (-1 <= r && r <= this.roh) {
          // TODO: compute demerits d and fitness class c
          // BEGIN: compute demerits d and fitness class c
          let [d, c] = this.computeDemeritsAndFitnessClass(par, a, b, r);
          // END: compute demerits d and fitness class c
          if (d < D[c]) {
            a.ratio = r;
            D[c] = d;
            Ac[c] = a;
            if (d < Dmax)
              Dmax = d;
          }
        }
        a = next_a;
        if (a === null)
          break;
        if (a.line >= j && j < this.j0())
          break;
        // repeat
      }
      if (Dmax < Infinity) {
        // TODO: insert new active nodes for breaks from Ac to b
        // BEGIN: insert new active nodes for breaks from Ac to b
        this.insertNewActiveNodesForBreaks(a, b, par, D, Dmax, Ac, prev_a);
        // END: insert new active nodes for breaks from Ac to b
      }
      if (a === null)
        break;
      // repeat
    }
    if (this.active_list === null) {
      // TODO: do something drastic since there is no feasible solution
      console.log('Hit "do something drastic since there is no feasible solution"');
    }
  }

  j0() {
    if (this.q != 0)
      return Infinity;
    for (let i = this.lines.length; i > 0; i--) {
      if (this.lines(i) !== this.lines(i - 1))
        return i - 1;
    }
    return 0;
  }


  demerits(a: NetworkNode, b: number, r: number): [number, number] {
    let d: number;
    let c: number;
    let bp = this.paragraph.body[b].penalty;
    let bf = this.paragraph.body[b].flagged;
    if (bp >= 0) {
      d = Math.pow(1 + 100 * Math.pow(Math.abs(r), 3) + bp, 2);
    } else if (bp !== Infinity) {
      Math.pow(1 + 100 * Math.pow(Math.abs(r), 3), 2) - Math.pow(bp, 2);
    } else {
      d = Math.pow(1 + 100 * Math.pow(Math.abs(r), 3), 2);
    }
    d += this.alpha * bf * this.paragraph.body[a.position].flagged;
    if (r < -0.5) {
      c = 0;
    } else if (r <= 0.5) {
      c = 1;
    } else if (r <= 1) {
      c = 2;
    } else {
      c = 3;
    }
    if (Math.abs(c - a.fitness) > 1) {
      d += this.gamma;
    }
    d += a.totaldemerits;
    return [d, c];
  }

  computeSumTriple(b: number): [number, number, number] {
    let tw: number = this.sum_w;
    let ty: number = this.sum_y;
    let tz: number = this.sum_z;
    let i: number = b;
    while (true) {
      if (i > this.paragraph.body.length)
        break;
      if (this.paragraph.body[i].type === 'box')
        break;
      if (this.paragraph.body[i].type === 'glue') {
        tw += this.paragraph.body[i].width;
        ty += (this.paragraph.body[i] as Glue).stretchability;
        tz += (this.paragraph.body[i] as Glue).shrinkability;
      } else if (this.paragraph.body[i].penalty === -Infinity
        && i > b) {
        break;
      }
      i += 1;
    }
    return [tw, ty, tz];
  }

  computeAdjustmentRatio(par: Array<ParagraphSequenceElement>, a: NetworkNode, b: number): [number, number] {
    let L = this.sum_w - a.totalwidth;
    let r;
    if (par[b].type === 'penalty')
      L += par[b].width;
    let j = a.line + 1;
    if (L < this.lines(j)) {
      let Y = this.sum_y - a.totalstretch;
      if (Y > 0) {
        r = (this.lines(j) - L) / Y;
      } else {
        r = Infinity;
      }
    } else if (L > this.lines(j)) {
      let Z = this.sum_z - a.totalshrink;
      if (Z > 0) {
        r = (this.lines(j) - L) / Z;
      } else {
        r = Infinity;
      }
    } else {
      r = 0;
    }
    return [j, r];
  }

  deactivateNode(a: NetworkNode, prev_a: NetworkNode, next_a: NetworkNode, Dmax: number, r: number): number {
    if (prev_a === null) {
      this.active_list = next_a;
    } else {
      prev_a.link = next_a;
    }
    if (this.active_list === null && Dmax === Infinity && r < -1) {
      // handle overfull box
      this.active_list = a;
      return -1;
    } else {
      a.link = this.passive_list;
      this.passive_list = a;
      return r;
    }
  }

  computeDemeritsAndFitnessClass(par: Array<ParagraphSequenceElement>, a: NetworkNode, b: number, r: number): [number, number] {
    let d, c;
    if (par[b].penalty >= 0) {
      d = Math.pow(1 + 100 * Math.pow(Math.abs(r), 3) + par[b].penalty, 2);
    } else if (par[b].penalty !== -Infinity) {
      d = Math.pow(1 + 100 * Math.pow(Math.abs(r), 3), 2) - Math.pow(par[b].penalty, 2);
    } else {
      d = Math.pow(1 + 100 * Math.pow(Math.abs(r), 3), 2)
    }
    d = d + this.alpha * par[b].flagged * par[a.position].flagged;
    if (r < -0.5) {
      c = 0;
    } else if (r <= 0.5) {
      c = 1;
    } else if (r <= 1) {
      c = 2;
    } else {
      c = 3;
    }
    if (Math.abs(c - a.fitness) > 1) {
      d = d + this.gamma;
    }
    d = d + a.totaldemerits;
    return [d, c];
  }

  computeTotalWidthStretchShrink(par: Array<ParagraphSequenceElement>, b: number): [number, number, number] {
    let tw = this.sum_w;
    let ty = this.sum_y;
    let tz = this.sum_z;
    for (let i = b; i < par.length; i++) {
      if (par[i].type === 'box')
        break;
      if (par[i].type === 'glue') {
        tw += par[i].width;
        ty += (par[i] as Glue).stretchability;
        tz += (par[i] as Glue).shrinkability;
      } else if (par[i].penalty === -Infinity && i > b) {
        break;
      }
    }
    return [tw, ty, tz];
  }

  insertNewActiveNodesForBreaks(a: NetworkNode, b: number, par: Array<ParagraphSequenceElement>, D: Array<number>, Dmax: number, Ac: Array<NetworkNode>, prev_a: NetworkNode) {
    // TODO: compute tw, ty, tz
    // BEGIN: compute tw, ty, tz
    let [tw, ty, tz] = this.computeTotalWidthStretchShrink(par, b);
    // END: compute tw, ty, tz
    for (let c = 0; c < 4; c++) {
      if (D[c] <= Dmax + this.gamma) {
        let s = new NetworkNode(b, Ac[c].line + 1, c, tw, ty, tz, D[c], Ac[c], a, Ac[c].ratio);
        if (prev_a === null) {
          this.active_list = s; // ??? paper says d, but I'm guessing it should be s
        } else {
          prev_a.link = s;
        }
        prev_a = s;
      }
    }
  }

  chooseNodeFewestDemerits(): [NetworkNode, number] {
    let a = this.active_list, b = this.active_list;
    let d = a.totaldemerits;
    while (true) {
      a = a.link;
      if (a === null)
        break;
      if (a.totaldemerits < d) {
        d = a.totaldemerits;
        b = a;
      }
    }
    return [b, b.line];
  }

  chooseAppropriateActiveNode(k: number, b: NetworkNode): [NetworkNode, number] {
    let a = this.active_list, s = 0, d;
    while (true) {
      let delta = a.line - k;
      if ((this.q <= delta && delta < s) || (s < delta && delta <= this.q)) {
        s = delta;
        d = a.totaldemerits;
        b = a;
      } else if (delta === s && a.totaldemerits < d) {
        d = a.totaldemerits;
        b = a;
      }
      a = a.link;
      if (a === null)
        break;
    }
    return [b, b.line];
  }
}


/**
 * provide functionality for the web
 */
class WebPar extends Paragraph {

  /** TypeSet object owning this paragraph */
  parent: TypeSet;

  constructor(parent: TypeSet) {
    super();
    /**
     * Before building the paragraph, we need the width of each word in pixels.
     * But that is not easily computed from <p>. So, first we re-insert all words
     * of the paragraph back into the paragraph as a sequence of <span>. Then, once
     * the spans are rendered, step through each word to get the width.
     */
    this.parent = parent;
  }

  /**
   * 
   * @param text - The raw paragraph text to break
   */
  build(target: HTMLElement) {
    // now we can assume that the paragraph is a span sequence
    console.log("in par.build()");
    let words = Array.from(target.childNodes);

    // first two spots are reserved for space and hyphen
    let space_width = (words[1] as HTMLElement).getBoundingClientRect().width;
    let hyphen_width = (words[0] as HTMLElement).getBoundingClientRect().width;
    // let space_stretch = (5) / 6;
    // let space_shrink = (5) / 9;
    let space_stretch = (space_width) / 6;
    let space_shrink = (space_width) / 9;

    for (let i = this.parent.PAR_ARRAY_OFFSET; i < words.length; i++) {
      // get widths of words
      if ((words[i] as HTMLElement).classList.contains(this.parent.BOX_CLASS)) {
        this.body.push(new Box(
          (words[i] as HTMLElement).getBoundingClientRect().width, // px
          words[i].textContent
        ));
      } else if ((words[i] as HTMLElement).classList.contains(this.parent.GLUE_CLASS)) {
        this.body.push(new Glue(space_width, space_stretch, space_shrink));
      } else if ((words[i] as HTMLElement).classList.contains(this.parent.PEN_CLASS)) {
        this.body.push(new Penalty(hyphen_width, 100, 1)); // guessing penalty = 100
      }
      if (DEBUG)
        console.log(`${words[i].textContent} -> ${(words[i] as HTMLElement).getBoundingClientRect().width}px wide`);
    }

    this.body.push(new Glue(0, Infinity, 0));
    this.body.push(new Penalty(0, -Infinity, 1))
  }

  clear() {
    this.body = [];
  }
}

// class WebBreak extends Break {
//   /** width of element (px) */
//   width: number;
//   /** height of line (px) */
//   line_height: number;
//   /** x position of element (px) */
//   x: number;
//   /** y position of element (px) */
//   y: number;
//   /** because line width queries the DOM,
//    * it's expensive, so use a cache to store
//    * already calculated lengths
//    */
//   line_cache: Map<number, number>;

//   constructor(x: number, y: number, width: number, line_height: number) {
//     super();
//     this.width = width;
//     this.line_height = line_height;
//     this.x = x;
//     this.y = y;
//     this.line_cache = new Map();
//   }

//   /** make knuth-plass aware of floating content */
//   lines(i: number): number {
//     // check cache
//     let check = this.line_cache.get(i);
//     if (check)
//       return check;

//     // get current line box
//     let line_box = {
//       x: this.x,
//       y: this.y + (i * this.line_height) + this.line_height / 2,
//       width: this.width,
//       height: this.line_height
//     };
//     // split the difference and get dimensions
//     let boxes: Array<DOMRect> = document
//       .elementsFromPoint(line_box.x + line_box.width, line_box.y)
//       .filter((x: Element) => !x.classList.contains(BASE_CLASS)) // skip breaker spans
//       .map(x => x.getBoundingClientRect());

//     // store left-most (biggest) overlap
//     let overlap: number = 0;
//     for (let j = 0; j < boxes.length; j++) {
//       if (boxes[j].x <= line_box.x) continue; // skip covering boxes
//       if (boxes[j].x >= line_box.x && boxes[j].x <= line_box.x + line_box.width) {
//         if ((line_box.x + line_box.width - boxes[j].x) > overlap)
//           overlap = line_box.x + line_box.width - boxes[j].x;
//       }
//     }
//     this.line_cache.set(i, this.width - overlap);
//     return this.width - overlap;
//   }
// }


// var HYPENCHAR = '_breakerhyphen_';
// var PAR_ARRAY_OFFSET = 2; // reserve 1st two spots for space and hyphen
// var GLUE_CLASS = 'breaker-glue';
// var BOX_CLASS = 'breaker-box';
// var PEN_CLASS = 'breaker-penalty';
// var BASE_CLASS = 'break';
// var VAR_PADDING = 0; // extra line padding for floats
// var DEBUG = false;

// function lines_from_par(par: HTMLElement, lineheight: number): Array<number> {
//   let dims = par.getBoundingClientRect();
//   type point = { x: number, y: number };

//   function points_from_line(fixed: number, length: number, base: number, res: number = 1): Array<point> {
//     let delta = length / res;
//     let points: Array<point> = [];
//     for (let i = 0; i <= length + 0.001; i += delta) {
//       points.push({
//         x: fixed,
//         y: base + i
//       });
//     }
//     return points;
//   }

//   let sides = [
//     points_from_line(dims.x, dims.y + dims.height, dims.y),
//     points_from_line(dims.y, dims.x + dims.width, dims.x),
//     points_from_line(dims.x + dims.width, dims.y + dims.height, dims.y),
//     points_from_line(dims.y + dims.height, dims.x + dims.width, dims.x)
//   ]; // left, top, right, bottom 

//   // get possible overlapping elements
//   let candidates: Array<HTMLElement> = [];
//   for (let side = 0; side < sides.length; side++)
//     sides[side].map(coord => document.elementsFromPoint(coord.x, coord.y)).forEach((elem: Array<HTMLElement>) => {
//       // calculate if elem[] contains elem inside par box
//       for (let i = 0; i < elem.length; i++) {
//         let dim = elem[i].getBoundingClientRect();
//         let styles = window.getComputedStyle(elem[i]);


//         if (dim.x > dims.x && dim.x < dims.x + dims.width || // top left, bottom left
//           dim.x + dim.width > dims.x && dim.x + dim.width < dims.x + dims.width) { // top right, bottom right
//           // top 
//           if (dim.y > dims.y && dim.y < dims.y + dims.height)
//             candidates.push(elem[i]);
//           // bottom 
//           else if (dim.y + dim.height > dims.y && dim.y + dim.height < dims.y + dims.height)
//             candidates.push(elem[i])
//         }
//       }
//     });
//   console.log(candidates);
//   return [];
// }


// function get_widths_from_par(dims: DOMRect, line_height: number): Array<number> {
//   let lines: Array<number> = [];

//   let unsafe_box: { elem: Element, dims: DOMRect };

//   for (let i = 0; i * line_height <= dims.height; i++) {
//     // get current line box
//     let line_box = {
//       x: dims.x,
//       y: dims.y + (i * line_height) + line_height / 2,
//       width: dims.width,
//       height: line_height
//     };
//     // split the difference and get dimensions
//     let boxes: Array<Element> = document
//       .elementsFromPoint(line_box.x + line_box.width, line_box.y)
//       .filter((x: Element) => !x.classList.contains(BASE_CLASS)); // skip breaker spans

//     // get possible overlapping elements
//     let candidates: Array<{ elem: Element, dims: DOMRect }> = [];
//     for (let j = 0; j < boxes.length; j++) {
//       let box_dims = boxes[j].getBoundingClientRect();
//       if (box_dims.x <= line_box.x) continue; // skip covering boxes
//       if (box_dims.x >= line_box.x && box_dims.x <= line_box.x + line_box.width) {
//         candidates.push({
//           elem: boxes[j],
//           dims: box_dims
//         });
//         if (DEBUG) {
//           console.log(`Found overlapping element`);
//           console.log(boxes[j]);
//         }
//       }
//     }
//     // check unsafe box
//     // if (unsafe_box && !(unsafe_box.dims.x <= line_box.x)) { // skip covering boxes
//     //   if (unsafe_box.dims.x >= line_box.x && unsafe_box.dims.x <= line_box.x + line_box.width)
//     //     candidates.push(unsafe_box);
//     // }

//     // store left-most (biggest) overlap
//     let overlap: number = 0;
//     for (let j = 0; j < candidates.length; j++) {
//       // calculate margins
//       let computed_styles = window.getComputedStyle(candidates[j].elem);
//       candidates[j].dims.x -= parseFloat(computed_styles.getPropertyValue('margin-left'));

//       // if box has bottom margin, it might extend lower to other lines
//       let margin_bottom = parseFloat(computed_styles.getPropertyValue('margin-bottom'));
//       if (margin_bottom > 0) {
//         candidates[j].dims.y += margin_bottom;
//         unsafe_box = candidates[j];
//         console.log(`adding unsafe box, margin: ${margin_bottom}`);
//       }

//       // run check again
//       let unsafe_overlap = 0;
//       if ((line_box.x + line_box.width - candidates[j].dims.x) > overlap) {
//         // check unsafe box
//         if (unsafe_box && unsafe_box.dims.y >= (line_box.y + line_height / 2) && unsafe_box.dims.y <= (line_box.y - line_height / 2)) {
//           unsafe_overlap = line_box.x + line_box.width - unsafe_box.dims.x;
//         } else {
//           unsafe_box = undefined;
//         }
//         overlap = line_box.x + line_box.width - candidates[j].dims.x;
//         if (unsafe_overlap > overlap)
//           overlap = unsafe_overlap;
//         if (overlap > 0)
//           overlap += VAR_PADDING;
//       }
//     }

//     lines.push(dims.width - overlap);
//   }
//   return lines;
// }

var DEBUG = false;

class TypeSet {

  HYPHENCHAR: string;
  /** reserve 1st two spots for space and hyphen */
  PAR_ARRAY_OFFSET: number;
  GLUE_CLASS: string;
  BOX_CLASS: string;
  PEN_CLASS: string;
  BASE_CLASS: string;
  /** extra line padding for floats */
  VAR_PADDING: number;
  DEBUG: boolean;

  constructor() {
    this.HYPHENCHAR = '_breakerhyphen_';
    this.PAR_ARRAY_OFFSET = 2;
    this.GLUE_CLASS = 'breaker-glue';
    this.BOX_CLASS = 'breaker-box';
    this.PEN_CLASS = 'breaker-penalty';
    this.BASE_CLASS = 'break';
    this.VAR_PADDING = 0;
    this.DEBUG = DEBUG || false;

    this.pre_transform();
    // calls set() implicity through MO, no need to invoke here
    this.transform();
    this.post_transform();
  }

  /** 
   * any  operations to perform before transformation
   */
  pre_transform() {
    new MutationObserver(
      (mutation_list, observer) => this.set(mutation_list, observer)
    ).observe(document.body, { childList: true, subtree: true } as MutationObserverInit);
    return this;
  }

  /**
   * Convert everything from collect_paragraphs
   * into whatever form is required for setting
   */
  transform() {
    let paragraphs = this.collect_paragraphs();

    for (let i = 0; i < paragraphs.length; i++) {

      // do replacement of pars
      // construct list in *memory* (no effect to DOM)
      let text = hyphenateSync(paragraphs[i].innerText, { hyphenChar: this.HYPHENCHAR });

      // split by whitespace
      let processed = text.replace(/\s+/g, ' ').replace(/(^\s+)|(\s+$)/g, '').split(' ')
      let word_list = document.createDocumentFragment();

      // first, insert a hyphen and space so we can measure them
      // at the same time
      let hyphen = document.createElement('span');
      hyphen.textContent = '-';
      // position out of view
      hyphen.setAttribute('style', 'position: absolute; top: -8000px; left: -8000px;');
      let space = document.createElement('span');
      space.textContent = '\u2005';
      space.setAttribute('style', 'position: absolute; top: -8000px; left: -8000px;');
      word_list.appendChild(hyphen);
      word_list.appendChild(space);

      for (let j = 0; j < processed.length; j++) {

        // insert words and hyphen penalties
        this.insert_word_or_hyphen(word_list, processed[j]);

        // inter-word glue
        if (j < processed.length - 1) {
          let glue = document.createElement('span');
          glue.setAttribute('class', `break ${this.GLUE_CLASS}`);
          let space = document.createTextNode('\u2005');
          glue.appendChild(space);
          word_list.appendChild(glue);
        }
      }

      // create new paragraph
      let new_par = document.createElement('p');
      new_par.setAttribute('class', 'break par');
      new_par.setAttribute('id', `${i}`);
      new_par.appendChild(word_list);

      let dims = paragraphs[i].getBoundingClientRect();
      new_par.setAttribute('style', `min-height: ${dims.height}; width: ${dims.width};`);

      // replace old paragraph
      paragraphs[i].parentElement.replaceChild(new_par, paragraphs[i]);
    }
    return this;
  }


  /**
   * any operations to perform after transformation
   */
  post_transform() { }

  /**
   * set
   */
  set(...args: Array<any>) {
    (args[0] as Array<MutationRecord>).forEach(elem => {
      // console.log(elem);
      // check all the added nodes
      for (let i = 0; i < elem.addedNodes.length; i++) {
        // if added node is a <p class="break par">, then
        // try the transformation
        let paragraph_element: HTMLElement = (elem.addedNodes[i] as HTMLElement);
        if (paragraph_element.classList.contains('par')) {

          let par = new WebPar(this);
          par.build(paragraph_element);

          // get par width (assume is box for now)
          let dims = paragraph_element.getBoundingClientRect();
          let breaker = new Break();
          let { breakpoints, ratios } = breaker.break(par, [dims.width]);

          // collect all breakpoint nodes 
          let dom_breakpoints: Array<HTMLElement> = [];
          for (let j = 1; j < breakpoints.length && breakpoints[j] + this.PAR_ARRAY_OFFSET < paragraph_element.childNodes.length; j++)
            dom_breakpoints.push(paragraph_element.childNodes[breakpoints[j] + this.PAR_ARRAY_OFFSET] as HTMLElement);

          // collect all glue
          let glue_by_line: Array<Array<HTMLElement>> = [];
          // initialize array
          for (let j = 0; j < breakpoints.length; j++)
            glue_by_line.push([]);
          for (let j = this.PAR_ARRAY_OFFSET, line = 1; j < paragraph_element.childNodes.length; j++) {
            if ((paragraph_element.childNodes[j] as HTMLElement).classList.contains(this.GLUE_CLASS))
              glue_by_line[line].push(paragraph_element.childNodes[j] as HTMLElement);
            if (breakpoints[line] === j)
              line++;
          }

          for (let j = 0; j < dom_breakpoints.length; j++) {
            if (dom_breakpoints[j].classList.contains(this.GLUE_CLASS)) {
              dom_breakpoints[j].insertAdjacentElement('afterend', document.createElement('br'));
              // from span_element back to the next breakpoint,
              // stretch all glue
            } else if (dom_breakpoints[j].classList.contains(this.PEN_CLASS)) {
              // insert hyphen, then break
              let hyphen = document.createElement('span');
              hyphen.textContent = '-';
              dom_breakpoints[j].insertAdjacentElement('afterend', hyphen);
              hyphen.insertAdjacentElement('afterend', document.createElement('br'));
            }
          }

          let space_width = (paragraph_element.childNodes[1] as HTMLElement).getBoundingClientRect().width;
          let space_stretch = (space_width) / 6;
          let space_shrink = (space_width) / 9;
          // now, adjust glue
          for (let line = 1; line < breakpoints.length; line++) {
            let glue_line: Array<HTMLElement> = glue_by_line[line];
            for (let glue = 0; glue < glue_line.length; glue++) {
              let adjustment = glue_line[glue].getBoundingClientRect().width;
              if (ratios[line] < 0)
                adjustment += ratios[line] * space_shrink;
              else
                adjustment += ratios[line] * space_stretch;
              glue_line[glue].setAttribute('style', `width: ${adjustment}px;`);
            }
          }

          // reset height
          paragraph_element.setAttribute('style', 'height: auto;');
        }
      }
    });
  }

  collect_paragraphs() {
    return document.getElementsByTagName('p');
  }

  insert_word_or_hyphen(word_list: DocumentFragment, word_string: string) {
    let word_parts = word_string.split(this.HYPHENCHAR);
    for (let i = 0; i < word_parts.length; i++) {
      let word_part = document.createElement('span');
      word_part.setAttribute('class', `break ${this.BOX_CLASS}`);
      word_part.textContent = word_parts[i];
      word_list.appendChild(word_part);
      if (i < word_parts.length - 1) {
        // add hyphen penalty
        let penalty = document.createElement('span');
        penalty.setAttribute('class', `break ${this.PEN_CLASS}`);
        word_list.appendChild(penalty);
      }
    }
  }

}

window.addEventListener('load', (event) => { new TypeSet(); });

// window.addEventListener('load', (event) => {
//   // get all paragraphs
//   let paragraphs = document.getElementsByTagName('p');
//   let widths: Map<string, Array<number>> = new Map();

//   // generate widths
//   for (let i = 0; i < paragraphs.length; i++) {
//     let dims = paragraphs[i].getBoundingClientRect();

//     // estimate line-height
//     let par_styles = window.getComputedStyle(paragraphs[i]);
//     let line_height: number;
//     // unitless or px?
//     let line_height_string: string = par_styles.getPropertyValue('line-height');
//     if (line_height_string.includes('px')) {
//       // treat as px line height
//       line_height = parseFloat(line_height_string);
//     } else if (!line_height_string.match(/[a-zA-Z]+/)) {
//       // treat as unitless
//       line_height = parseFloat(par_styles.getPropertyValue('font-size')) * parseFloat(line_height_string);
//     } else {
//       // default to 1.2
//       line_height = parseFloat(par_styles.getPropertyValue('font-size')) * 1.2;
//     }

//     // to detect floats, grab offsets *before* replacing paragraphs.
//     let width: Array<number> = get_widths_from_par(dims, line_height);
//     // store width list
//     widths.set(`${i}`, width);
//   }

//   // set up an MO to catch the updated pars
//   new MutationObserver((mutationList, observer) => {
//     mutationList.forEach(elem => {
//       // console.log(elem);
//       // check all the added nodes
//       for (let i = 0; i < elem.addedNodes.length; i++) {
//         // if added node is a <p class="break par">, then
//         // try the transformation
//         let paragraph_element: HTMLElement = (elem.addedNodes[i] as HTMLElement);
//         if (paragraph_element.classList.contains('par')) {

//           let par = new WebPar();
//           par.build(paragraph_element);

//           // get par width (assume is box for now)
//           // let dims = paragraph_element.getBoundingClientRect();
//           // let line_height = (paragraph_element.childNodes[0] as HTMLElement).getBoundingClientRect().height;
//           // let breaker = new WebBreak(dims.x, dims.y, dims.width, line_height);
//           let breaker = new Break();
//           let { breakpoints, ratios } = breaker.break(par, widths.get(paragraph_element.getAttribute('id')));
//           // console.log(breakpoints);
//           // console.log(ratios);

//           // collect all breakpoint nodes 
//           let dom_breakpoints: Array<HTMLElement> = [];
//           for (let j = 1; j < breakpoints.length && breakpoints[j] + PAR_ARRAY_OFFSET < paragraph_element.childNodes.length; j++)
//             dom_breakpoints.push(paragraph_element.childNodes[breakpoints[j] + PAR_ARRAY_OFFSET] as HTMLElement);

//           // collect all glue
//           let glue_by_line: Array<Array<HTMLElement>> = [];
//           // initialize array
//           for (let j = 0; j < breakpoints.length; j++)
//             glue_by_line.push([]);
//           for (let j = PAR_ARRAY_OFFSET, line = 1; j < paragraph_element.childNodes.length; j++) {
//             if ((paragraph_element.childNodes[j] as HTMLElement).classList.contains(GLUE_CLASS))
//               glue_by_line[line].push(paragraph_element.childNodes[j] as HTMLElement);
//             if (breakpoints[line] === j)
//               line++;
//           }
//           // console.log(glue_by_line);

//           // now, insert <br>
//           for (let j = 0; j < dom_breakpoints.length; j++) {
//             if (dom_breakpoints[j].classList.contains(GLUE_CLASS)) {
//               dom_breakpoints[j].insertAdjacentElement('afterend', document.createElement('br'));
//               // from span_element back to the next breakpoint,
//               // stretch all glue
//             } else if (dom_breakpoints[j].classList.contains(PEN_CLASS)) {
//               // insert hyphen, then break
//               let hyphen = document.createElement('span');
//               hyphen.textContent = '-';
//               dom_breakpoints[j].insertAdjacentElement('afterend', hyphen);
//               hyphen.insertAdjacentElement('afterend', document.createElement('br'));
//             }
//           }

//           let space_width = (paragraph_element.childNodes[1] as HTMLElement).getBoundingClientRect().width;
//           let space_stretch = (space_width) / 6;
//           let space_shrink = (space_width) / 9;
//           // now, adjust glue
//           for (let line = 1; line < breakpoints.length; line++) {
//             let glue_line: Array<HTMLElement> = glue_by_line[line];
//             for (let glue = 0; glue < glue_line.length; glue++) {
//               let adjustment = glue_line[glue].getBoundingClientRect().width;
//               if (ratios[line] < 0)
//                 adjustment += ratios[line] * space_shrink;
//               else
//                 adjustment += ratios[line] * space_stretch;
//               glue_line[glue].setAttribute('style', `width: ${adjustment}px;`);
//             }
//           }

//           // reset height
//           paragraph_element.setAttribute('style', 'height: auto;');
//         }
//       }
//     });
//   }).observe(document.body, { childList: true, subtree: true } as MutationObserverInit);

//   for (let i = 0; i < paragraphs.length; i++) {

//     // do replacement of pars
//     // construct list in *memory* (no effect to DOM)
//     let text = hyphenateSync(paragraphs[i].innerText, { hyphenChar: HYPENCHAR });

//     // split by whitespace
//     let processed = text.replace(/\s+/g, ' ').replace(/(^\s+)|(\s+$)/g, '').split(' ')
//     let word_list = document.createDocumentFragment();

//     // first, insert a hyphen and space so we can measure them
//     // at the same time
//     let hyphen = document.createElement('span');
//     hyphen.textContent = '-';
//     // position out of view
//     hyphen.setAttribute('style', 'position: absolute; top: -8000px; left: -8000px;');
//     let space = document.createElement('span');
//     space.textContent = '\u2005';
//     space.setAttribute('style', 'position: absolute; top: -8000px; left: -8000px;');
//     word_list.appendChild(hyphen);
//     word_list.appendChild(space);

//     for (let j = 0; j < processed.length; j++) {

//       // insert words and hyphen penalties
//       insert_word_or_hyphen(word_list, processed[j]);

//       // inter-word glue
//       if (j < processed.length - 1) {
//         let glue = document.createElement('span');
//         glue.setAttribute('class', `break ${GLUE_CLASS}`);
//         let space = document.createTextNode('\u2005');
//         glue.appendChild(space);
//         word_list.appendChild(glue);
//       }
//     }

//     // create new paragraph
//     let new_par = document.createElement('p');
//     new_par.setAttribute('class', 'break par');
//     new_par.setAttribute('id', `${i}`);
//     new_par.appendChild(word_list);

//     let dims = paragraphs[i].getBoundingClientRect();
//     new_par.setAttribute('style', `min-height: ${dims.height}; width: ${dims.width};`);

//     // replace old paragraph
//     paragraphs[i].parentElement.replaceChild(new_par, paragraphs[i]);
//   }
// });
