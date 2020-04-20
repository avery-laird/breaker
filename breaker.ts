namespace Breaker {
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

  export type ParagraphSequenceElement = Box | Glue | Penalty;
  export class Paragraph {
    /*
    A paragraph is a sequence x_1, x_2, ... x_m of m items, where each individual 
    item x_i is either a box specification, a glue specification, or a
    penalty specification.
    */
    body: Array<ParagraphSequenceElement>
    constructor() {
      this.body = [];
    }

    build(text: string) {
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
      this.body.push(new Box(2, '  '));
      for (let i = 0; i < text.length; i++) {
        if (text[i] !== ' ') {
          // treat words as boxes for now, because inter-character spacing seems tricky in the DOM
          let word = text[i++];
          while (text[i] !== ' ' && i < text.length) word += text[i++];
          this.body.push(new Box(word.length, word));
          i--;
        } else {
          this.body.push(new Glue(1, 3, 2));
        }
      }
      // (5)
      this.body.push(new Glue(0, Infinity, 0));
      this.body.push(new Penalty(0, -Infinity, 0));
    }
  }
  class Node {
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
    previous: Node;
    // pointer to the next node in the list
    link: Node;
    active: boolean;

    constructor(
      position: number,
      line: number,
      fitness: number,
      totalwidth: number,
      totalstretch: number,
      totalshrink: number,
      totaldemerits: number,
      previous: Node,
      link: Node) {
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

    deactivate(prev_a: Node, active_list: Node, next_a: Node, passive_list: Node) {
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

  export class Break {
    active_list: Node;
    passive_list: Node;
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


    constructor(par: Paragraph, lines_array: Array<number>) {
      this.paragraph = par;
      this.lines_array = lines_array;
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

    break() {
      // DONE: create an active node representing the beginning of the paragraph
      this.active_list = new Node(0, 0, 1, 0, 0, 0, 0, null, null);
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
      let Ac = [null, null, null, null];
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


    demerits(a: Node, b: number, r: number): [number, number] {
      let d: number;
      let c: number;
      let bp = this.paragraph[b].penalty;
      let bf = this.paragraph[b].flagged;
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

    // computeAdjustmentRatio(a: Node, b: number): [number, number] {
    //   /**  compute adjustment ratio r from a to b and return
    //         [j, r]
    //   */
    //   let L: number = this.sum_w - a.totalwidth;
    //   if (this.paragraph.body[b].type === 'penalty')
    //     L += this.paragraph.body[b].width;
    //   let j: number = a.line + 1;
    //   if (L < this.lines(j)) {
    //     let Y: number = this.sum_y - a.totalstretch;
    //     if (Y > 0)
    //       return [j, (this.lines(j) - L) / Y];
    //     return [j, Infinity];
    //   } else if (L > this.lines(j)) {
    //     let Z: number = this.sum_z - a.totalshrink;
    //     if (Z > 0)
    //       return [j, (this.lines(j) - L) / Z];
    //     return [j, Infinity];
    //   } else {
    //     return [j, 0];
    //   }
    // }

    computeAdjustmentRatio(par: Array<ParagraphSequenceElement>, a: Node, b: number): [number, number, number] {
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
      return [L, j, r];
    }

    deactivateNode(a: Node, prev_a: Node, next_a: Node) {
      if (prev_a === null) {
        this.active_list = next_a;
      } else {
        prev_a.link = next_a;
      }
      a.link = this.passive_list;
      this.passive_list = a;
    }

    computeDemeritsAndFitnessClass(par: Array<ParagraphSequenceElement>, a: Node, b: number, r: number): [number, number] {
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

    insertNewActiveNodesForBreaks(a: Node, b: number, par: Array<ParagraphSequenceElement>, D: Array<number>, Dmax: number, Ac: Array<Node>, prev_a: Node) {
      // TODO: compute tw, ty, tz
      // BEGIN: compute tw, ty, tz
      let [tw, ty, tz] = this.computeTotalWidthStretchShrink(par, b);
      // END: compute tw, ty, tz
      for (let c = 0; c < 4; c++) {
        if (D[c] <= Dmax + this.gamma) {
          let s = new Node(b, Ac[c].line + 1, c, tw, ty, tz, D[c], Ac[c], a);
          if (prev_a === null) {
            this.active_list = s; // ??? paper says d, but I'm guessing it should be s
          } else {
            prev_a.link = s;
          }
          prev_a = s;
        }
      }
    }

    chooseNodeFewestDemerits(): [Node, number] {
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

    chooseAppropriateActiveNode(k: number, b: Node): [Node, number] {
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
}


let partest = new Breaker.Paragraph();
partest.build("Far out in the uncharted backwaters of the unfashionable end of the western spiral arm of the Galaxy lies a small unregarded yellow sun. Orbiting this at a distance of roughly ninety-­‐two million miles is an utterly insignificant little blue green planet whose ape-­‐descended life forms are so amazingly primitive that they still think digital watches are a pretty neat idea. This planet hasʹor rather hadʹa problem, which was this: most of the people on it were unhappy for pretty much of the time. Many solutions were suggested for this problem, but most of these were largely concerned with the movements of small green pieces of paper, which is odd because on the whole it wasn't the small green pieces of paper that were unhappy.");
let breaker = new Breaker.Break(partest, [60]);
let test = breaker.break();

process.stdout.write('\n\n');
for (let i = 0, j = 1, toPrint = ''; i < partest.body.length; i++, toPrint = '') {
  toPrint = partest.body[i].toString();
  if (test[j] === i) {
    toPrint += '\n';
    j++;
  }
  process.stdout.write(toPrint);
}
process.stdout.write('\n\n');
