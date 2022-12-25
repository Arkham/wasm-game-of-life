mod utils;

use wasm_bindgen::prelude::*;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

extern crate web_sys;
// A macro to provide `println!(..)`-style syntax for `console.log` logging.
macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cell {
    Dead = 0,
    Alive = 1,
}

impl Cell {
    fn toggle(&mut self) {
        *self = match *self {
            Cell::Dead => Cell::Alive,
            Cell::Alive => Cell::Dead,
        }
    }
}

#[wasm_bindgen]
pub struct Universe {
    width: i32,
    height: i32,
    cells: Vec<Cell>,
}

impl Default for Universe {
    fn default() -> Self {
        Self::new()
    }
}

extern crate js_sys;

/// Public methods, exported to JavaScript.
#[wasm_bindgen]
impl Universe {
    pub fn new() -> Universe {
        utils::set_panic_hook();

        let width = 64;
        let height = 64;

        let cells = (0..width * height)
            .map(|i| {
                if i % 2 == 0 || i % 7 == 0 {
                    Cell::Alive
                } else {
                    Cell::Dead
                }
            })
            .collect();

        Universe {
            width,
            height,
            cells,
        }
    }

    pub fn random_new() -> Universe {
        let width = 64;
        let height = 64;

        let cells = (0..width * height)
            .map(|_| {
                if js_sys::Math::random() < 0.5 {
                    Cell::Alive
                } else {
                    Cell::Dead
                }
            })
            .collect();

        Universe {
            width,
            height,
            cells,
        }
    }

    pub fn width(&self) -> i32 {
        self.width
    }

    pub fn height(&self) -> i32 {
        self.height
    }

    pub fn cells(&self) -> *const Cell {
        self.cells.as_ptr()
    }

    pub fn toggle_cell(&mut self, row: i32, col: i32) {
        let idx = self.get_index(row, col);
        self.cells[idx].toggle();
    }

    pub fn add_slider(&mut self, row: i32, col: i32) {
        self.add_pattern(row, col, vec![(0, -1), (1, 0), (-1, 1), (0, 1), (1, 1)])
    }

    pub fn add_pulsar(&mut self, row: i32, col: i32) {
        let pulsar_pattern = "  ###   ###

#    # #    #
#    # #    #
#    # #    #
  ###   ###

  ###   ###
#    # #    #
#    # #    #
#    # #    #

  ###   ###";

        let mut result = Vec::new();
        for (y, line) in pulsar_pattern.lines().enumerate() {
            for (x, value) in line.chars().enumerate() {
                if value == '#' {
                    result.push((y as i32 - 7, x as i32 - 6));
                }
            }
        }

        self.add_pattern(row, col, result);
    }

    fn add_pattern(&mut self, row: i32, col: i32, pattern: Vec<(i32, i32)>) {
        for (d_row, d_col) in pattern.iter().copied() {
            let pattern_row = (row + d_row).wrapping_rem_euclid(self.height);
            let pattern_col = (col + d_col).wrapping_rem_euclid(self.width);
            let idx = self.get_index(pattern_row, pattern_col);
            self.cells[idx] = Cell::Alive;
        }
    }

    fn get_index(&self, row: i32, col: i32) -> usize {
        (row * self.width + col) as usize
    }

    fn live_neighbour_count(&self, row: i32, col: i32) -> u8 {
        let mut count = 0;

        for delta_row in [-1, 0, 1].iter().cloned() {
            for delta_col in [-1, 0, 1].iter().cloned() {
                if (delta_row, delta_col) == (0, 0) {
                    continue;
                }

                let neighbour_row = (row + delta_row).wrapping_rem_euclid(self.height);
                let neighbour_col = (col + delta_col).wrapping_rem_euclid(self.width);
                let idx = self.get_index(neighbour_row, neighbour_col);
                count += self.cells[idx] as u8;
            }
        }

        count
    }

    pub fn tick(&mut self) {
        let mut next = self.cells.clone();

        for row in 0..self.height {
            for col in 0..self.width {
                let idx = self.get_index(row, col);
                let cell = self.cells[idx];
                let live_neighbours = self.live_neighbour_count(row, col);
                // log!(
                //     "cell[{},{}] is initially {:?} and has {} live neighbours",
                //     row,
                //     col,
                //     cell,
                //     live_neighbours
                // );

                let next_cell = match (cell, live_neighbours) {
                    (Cell::Alive, 0..=1) => Cell::Dead,
                    (Cell::Alive, 2..=3) => Cell::Alive,
                    (Cell::Alive, 4..=8) => Cell::Dead,
                    (Cell::Dead, 3) => Cell::Alive,
                    _ => Cell::Dead,
                };

                // log!("    it becomes {:?}", next_cell);

                next[idx] = next_cell;
            }
        }

        self.cells = next;
    }
}

use std::fmt;

impl fmt::Display for Universe {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        for line in self.cells.as_slice().chunks(self.width as usize) {
            for &cell in line {
                let sym = if cell == Cell::Dead { '◻' } else { '◼' };
                write!(f, "{}", sym)?;
            }
            writeln!(f)?;
        }

        Ok(())
    }
}
