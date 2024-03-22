package com.tomy.artifyme.artwork;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ArtworkController {

    private final ArtworkService artworkService;

    @PostMapping("/api/v1/artwork")
    public ResponseEntity<ArtworkResponse> saveArtwork(@RequestBody ArtworkRequest request) {
        return artworkService.saveArtwork(request);
    }

    @GetMapping("/api/v1/artworks")
    public ResponseEntity<PageResponse> getArtworksWithPagination(
    @RequestParam(value = "pageNumber", required = false, defaultValue = "1") Integer pageNumber,
    @RequestParam(value = "pageSize", required = false, defaultValue = "10") Integer pageSize,
    @RequestParam(value = "useremail", required = true) String userEmail) {
        return artworkService.getArtworksWithPagination(pageNumber, pageSize, userEmail);
    }

    @GetMapping("/api/v1/artwork")
    public ResponseEntity<Object> getArtworkFromId(
        @RequestParam(value = "id", required = true) String id
    ){
        return artworkService.getArtworkById(id);
    }

    @DeleteMapping("/api/v1/artwork")
    public ResponseEntity<Object> deleteArtworkById(@RequestParam(value = "id", required = true) String id) {
        return artworkService.deleteArtwork(id);
    }

     @PatchMapping("/api/v1/artwork")
    public ResponseEntity<Object> updateArtwork(@RequestParam(value = "id", required = true) String id, @RequestBody ArtworkRequest request) {
        // Call the updateArtwork method of the artworkService and return its response
        return artworkService.updateArtwork(id, request);
    }
}
