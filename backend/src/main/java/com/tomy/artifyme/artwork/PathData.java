package com.tomy.artifyme.artwork;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PathData {
    private String color;
    private List<String> path;
    private int size;
}