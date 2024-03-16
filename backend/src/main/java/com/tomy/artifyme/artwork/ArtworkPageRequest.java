package com.tomy.artifyme.artwork;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ArtworkPageRequest {
    private Integer pageNumber;
    private Integer pageSize;
    private String useremail;
 
}
