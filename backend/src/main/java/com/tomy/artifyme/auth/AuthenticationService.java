package com.tomy.artifyme.auth;

import com.tomy.artifyme.config.JwtService;
import com.tomy.artifyme.user.User;
import com.tomy.artifyme.user.UserRepository;
import lombok.RequiredArgsConstructor;

import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;


@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

@SuppressWarnings("null")
public ResponseEntity<AuthenticationResponse> register(RegisterRequest request) {
    try {
        // Check if user with provided email already exists
        if (repository.findByEmail(request.getEmail()).isPresent()) {
            // User with email already exists, handle appropriately
            throw new RuntimeException("Email is already in use");
        }

        if (request.getFirstname() == null || request.getLastname() == null || request.getEmail() == null || request.getPassword() == null) {
            throw new RuntimeException("All fields (firstname, lastname, email, password) are required.");
        }

        var user = User.builder()
                .firstname(request.getFirstname())
                .lastname(request.getLastname())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role("User")
                .active(true)
                .build();

        repository.save(user);
        var jwtToken = jwtService.generateToken(user);
        return ResponseEntity.ok(AuthenticationResponse.builder()
                .token(jwtToken)
                .build());
    } catch (RuntimeException e) {
        // Handle email already in use exception
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(AuthenticationResponse.builder()
                .errorMessage(e.getMessage())
                .build());
    }  catch (Exception e) {
        // Handle any other unexpected exceptions
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(AuthenticationResponse.builder()
                .errorMessage("An unexpected error occurred")
                .build());
    }
}


    public AuthenticationResponse authenticate(AuthenticationRequest request)
    {
       authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(
            request.getEmail(),
            request.getPassword()
        )
    );
    var user = repository.findByEmail(request.getEmail())
        .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + request.getEmail()));
    var jwtToken = jwtService.generateToken(user);
    return AuthenticationResponse.builder()
        .token(jwtToken)
        .build();
    }

    public ResponseEntity<Object> changePassword(AuthenticationRequest request) {
        try {

            System.out.println("change password request: "+ request);
            // Check if email and password are provided
            if (request.getEmail() == null || request.getPassword() == null) {
                throw new IllegalArgumentException("Email and password are required.");
            }
            
            // Find the user by email
            Optional<User> optionalUser = repository.findByEmail(request.getEmail());
            
            if (optionalUser.isPresent()) {
                // Update the password
                User user = optionalUser.get();
                user.setPassword(passwordEncoder.encode(request.getPassword())); // Encode the new password
                
                // Save the updated user
                repository.save(user);
                
                return ResponseEntity.ok().build();
            } else {
                // User with the provided email not found
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            // Handle case where email or password was not provided
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            // Handle any unexpected errors
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    

}