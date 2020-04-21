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
    this.shrinkability = y;
    this.stretchability = z;
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
    link: NetworkNode) {
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
    this.roh = Infinity;
    this.alpha = 0;
    this.gamma = 0;
  }

  lines(i: number): number {
    if (i > this.lines_array.length - 1)
      return this.lines_array[this.lines_array.length - 1];
    return this.lines_array[i];
  }

  break(paragraph: Paragraph, lines_array: Array<number>) {

    this.paragraph = paragraph;
    this.lines_array = lines_array;

    // DONE: create an active node representing the beginning of the paragraph
    this.active_list = new NetworkNode(0, 0, 1, 0, 0, 0, 0, null, null);
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
    for (let j = linenumber; j >= 0; j--) {
      // DEBUG 
      console.log(chosen.ratio);
      breakpoints[j] = chosen.position;
      chosen = chosen.previous;
    }
    // END: use the chosen node to determine the optimal breakpoint sequence
    return breakpoints;
  }

  mainLoop(b: number) {
    let par = this.paragraph.body;
    let a = this.active_list;
    let prev_a = null;
    let D = [Infinity, Infinity, Infinity, Infinity];
    let Dmax = Infinity;
    let Ac: Array<NetworkNode> = [null, null, null, null];
    while (true) {
      let next_a;
      while (true) {
        next_a = a.link;
        // TODO: compute adjustment ratio r from a to b
        // BEGIN: adj ratio from a to b (a, par, lines) -> (r, j)
        let [L, j, r] = this.computeAdjustmentRatio(par, a, b);
        // END: adj ratio r from a to b
        if (r < -1 || par[b].penalty === -Infinity) {
          // TODO: deactivate node a
          // BEGIN: deactivate node a
          this.deactivateNode(a, prev_a, next_a);
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

  computeAdjustmentRatio(par: Array<ParagraphSequenceElement>, a: NetworkNode, b: number): [number, number, number] {
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
    a.ratio = r;
    return [L, j, r];
  }

  deactivateNode(a: NetworkNode, prev_a: NetworkNode, next_a: NetworkNode) {
    if (prev_a === null) {
      this.active_list = next_a;
    } else {
      prev_a.link = next_a;
    }
    a.link = this.passive_list;
    this.passive_list = a;
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
    for (let i = b; i > par.length; i++) {
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
        let s = new NetworkNode(b, Ac[c].line + 1, c, tw, ty, tz, D[c], Ac[c], a);
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


// let partest = new Paragraph();
// partest.build("Far out in the uncharted backwaters of the unfashionable end of the western spiral arm of the Galaxy lies a small unregarded yellow sun. Orbiting this at a distance of roughly ninety-­‐two million miles is an utterly insignificant little blue green planet whose ape-­‐descended life forms are so amazingly primitive that they still think digital watches are a pretty neat idea. This planet hasʹor rather hadʹa problem, which was this: most of the people on it were unhappy for pretty much of the time. Many solutions were suggested for this problem, but most of these were largely concerned with the movements of small green pieces of paper, which is odd because on the whole it wasn't the small green pieces of paper that were unhappy.");
// let breaker = new Break(partest, [60]);
// let test = breaker.break();

// process.stdout.write('\n\n');
// for (let i = 0, j = 1, toPrint = ''; i < partest.body.length; i++, toPrint = '') {
//   toPrint = partest.body[i].toString();
//   if (test[j] === i) {
//     toPrint += '\n';
//     j++;
//   }
//   process.stdout.write(toPrint);
// }
// process.stdout.write('\n\n');

function insertBreaks(breakpoints: Array<number>, par: Paragraph): string {
  let result = '';
  for (let i = 0, j = 1; i < par.body.length; i++) {
    result += par.body[i].toString();
    if (breakpoints[j] === i) {
      result += '\n';
      j++;
    }
  }
  return result;
}

/**
 * provide functionality for the web
 */
class WebPar extends Paragraph {

  constructor() {
    super();
    /**
     * Before building the paragraph, we need the width of each word in pixels.
     * But that is not easily computed from <p>. So, first we re-insert all words
     * of the paragraph back into the paragraph as a sequence of <span>. Then, once
     * the spans are rendered, step through each word to get the width.
     */
  }

  /**
   * 
   * @param text - The raw paragraph text to break
   */
  build(target: HTMLElement) {
    // now we can assume that the paragraph is a span sequence
    console.log("in par.build()");
    let words = Array.from(target.childNodes);
    for (let i = 0; i < words.length; i++) {
      // get widths of words
      if ((words[i] as HTMLElement).classList.contains('box')) {
        console.log((words[i] as HTMLElement).getBoundingClientRect().width + "px");
      }
    }

    // for (let i = 0; i < processed.length; i++) {
    //   // get box width
    //   this.body.push(new Box(this.measure(processed[i]), processed[i]));
    //   if (i < processed.length - 1)
    //     this.body.push(new Glue(this.measure(' '), 1, 1));
    // }
    // this.body.push(new Glue(0, Infinity, 0));
    // this.body.push(new Penalty(0, -Infinity, 0));
  }

  clear() {
    this.body = [];
  }
}

function insert_word_or_hyphen(word_list: DocumentFragment, word_string: string) {
  let word_parts = word_string.split(HYPENCHAR);
  for (let i = 0; i < word_parts.length; i++) {
    let word_part = document.createElement('span');
    word_part.setAttribute('class', 'break box');
    word_part.innerText = word_parts[i];
    word_list.appendChild(word_part);
    if (i < word_parts.length - 1) {
      // add hyphen penalty
      let penalty = document.createElement('span');
      penalty.setAttribute('class', 'break penalty');
      word_list.appendChild(penalty);
    }
  }
}

var HYPENCHAR = '_breakerhyphen_';

window.addEventListener('DOMContentLoaded', (event) => {
  console.log("Starting");
  // get all paragraphs
  let paragraphs = document.getElementsByTagName('p');
  let breaker = new Break();

  // set up an MO to catch the updated pars
  new MutationObserver((mutationList, observer) => {
    console.log("New pars detected");
    mutationList.forEach(elem => {
      console.log(elem);
      // check all the added nodes
      for (let i = 0; i < elem.addedNodes.length; i++) {
        // if added node is a <p class="break par">, then
        // try the transformation
        if ((elem.addedNodes[i] as HTMLElement).classList.contains('par')) {
          let par = new WebPar();
          par.build(elem.addedNodes[i] as HTMLElement);
        }
      }
    });
  }).observe(document.body, { childList: true } as MutationObserverInit);

  for (let i = 0; i < paragraphs.length; i++) {
    // get width
    let rect = paragraphs[i].getBoundingClientRect();
    let width = rect.width; // in px
    console.log(width + "px");

    // do replacement of pars
    // construct list in *memory* (no effect to DOM)
    let text = hyphenateSync(paragraphs[i].innerText, { hyphenChar: HYPENCHAR });
    console.log(text);
    // split by whitespace
    let processed = text.replace(/\s+/g, ' ').replace(/(^\s+)|(\s+$)/g, '').split(' ')
    let word_list = document.createDocumentFragment();
    for (let i = 0; i < processed.length; i++) {

      // insert words and hyphen penalties
      insert_word_or_hyphen(word_list, processed[i]);

      // inter-word glue
      if (i < processed.length - 1) {
        let glue = document.createElement('span');
        glue.setAttribute('class', 'break glue');
        let space = document.createTextNode('\u202F');
        glue.appendChild(space);
        word_list.appendChild(glue);
      }
    }

    // create new paragraph
    let new_par = document.createElement('p');
    new_par.setAttribute('class', 'break par');
    new_par.appendChild(word_list);

    // replace old paragraph
    paragraphs[i].parentElement.replaceChild(new_par, paragraphs[i]);
  }
});
