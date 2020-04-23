# Knuth-Plass in Typescript

This is a project to get a minimal working version of the Knuth-Plass algorithm for the web.

I'm writing this to get a better understanding of how the algorithm works, with the goal of rewriting it in Rust and compiling to webassembly.

## How does it work?
There are two main components: a `Paragraph` class representing paragraphs, and a `Break` class implementing the Knuth-Plass linebreaking algorithm. `Break.break` takes a paragraph and list of line lengths as input, and outputs a record of breakpoints and adjustment ratios.

Getting Knuth-Plass to work on the web is complicated, because the width of boxes, penalties, and glue is needed. This is usually derived from the font used, but there are no good font metrics for the web. The usual method for handling this is creating a "ruler" way outside the viewport. To measure something, put it in the ruler, wait for it to render, and grab the length.

This isn't a very efficient solution, because we will need to render that box again in the paragraph. So instead, paragraphs are converted into a sequence of spans. This way, everything only needs to be rendered once. Once `Break.break` is complete, a `<br>` is inserted at each breakpoint, and all the glue for that line is stretched/shrunk according to the adjustment ratio.

## Progress
- [x] hyphenation
- [x] overfull boxes
- [ ] detect floating content 
- [ ] Knuth-Plass in linear time using SMAWK and Rust -> WASM 

## Current examples:

![test 1](test1.png?raw=true)
![test 2](test2.png?raw=true)