package com.tomy.artifyme.artwork;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ArtworkController {

    private final ArtworkService artworkService;

    @PostMapping("/api/v1/artwork/save")
    public ResponseEntity<SaveArtworkResponse> saveArtwork(@RequestBody SaveArtworkRequest request) {
        return artworkService.saveArtwork(request);
    }

    @GetMapping("/api/v1/artworks")
    public ResponseEntity<PageResponse> getArtworksWithPagination(
    @RequestParam(value = "pageNumber", required = false, defaultValue = "1") Integer pageNumber,
    @RequestParam(value = "pageSize", required = false, defaultValue = "10") Integer pageSize,
    @RequestParam(value = "useremail", required = false) String userEmail) {
        return artworkService.getArtworksWithPagination(pageNumber, pageSize, userEmail);
    }

}
