package com.tomy.artifyme.artwork;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
}
