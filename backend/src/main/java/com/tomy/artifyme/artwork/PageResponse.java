package com.tomy.artifyme.artwork;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PageResponse {
    
    private List<Artwork> content;
    private boolean isNext;
    private String message;
}
