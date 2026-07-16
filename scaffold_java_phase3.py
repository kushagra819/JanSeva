import os
from pathlib import Path

def create_file(path, content):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

create_file("backend/src/main/java/com/janseva/config/JwtAuthenticationFilter.java", """
package com.janseva.config;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Value("${janseva.security.jwt-secret}")
    private String jwtSecret;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Claims claims = Jwts.parserBuilder()
                        .setSigningKey(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)))
                        .build()
                        .parseClaimsJws(token)
                        .getBody();
                String role = claims.get("role", String.class);
                String userId = claims.getSubject();
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        userId, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role)));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception e) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }
}
""")

create_file("backend/src/main/java/com/janseva/config/SecurityConfigCustom.java", """
package com.janseva.config;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfigCustom {
    private final JwtAuthenticationFilter jwtFilter;
    public SecurityConfigCustom(JwtAuthenticationFilter jwtFilter) { this.jwtFilter = jwtFilter; }
    @Bean
    @Primary
    public SecurityFilterChain filterChainCustom(HttpSecurity http) throws Exception {
        http.cors(c -> c.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**", "/api/v1/meta", "/error").permitAll()
                .requestMatchers("/api/v1/admin/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers("/api/v1/staff/**").hasAnyAuthority("ROLE_OFFICER", "ROLE_DEPARTMENT_HEAD", "ROLE_ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.addAllowedOriginPattern("*");
        config.addAllowedMethod("*");
        config.addAllowedHeader("*");
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
""")

create_file("backend/src/main/java/com/janseva/dto/AiAnalysisResponse.java", """
package com.janseva.dto;
import java.util.List;
public class AiAnalysisResponse {
    public String grievanceId;
    public String taxonomyCode;
    public String departmentCode;
    public Double confidence;
    public String priority;
    public String priorityReason;
    public List<String> urgentReasons;
    public String explanation;
    public String decision;
    public Boolean requiresHumanReview;
}
""")

create_file("backend/src/main/java/com/janseva/service/AiClientService.java", """
package com.janseva.service;
import com.janseva.dto.AiAnalysisResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.util.HashMap;
import java.util.Map;

@Service
public class AiClientService {
    @Value("${janseva.ai.url}")
    private String aiUrl;
    private final RestTemplate restTemplate = new RestTemplate();

    public AiAnalysisResponse analyzeGrievance(String grievanceId, String text) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, String> body = new HashMap<>();
        body.put("grievanceId", grievanceId);
        body.put("text", text);
        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
        try {
            return restTemplate.postForObject(aiUrl, request, AiAnalysisResponse.class);
        } catch (Exception e) {
            System.err.println("AI Service error: " + e.getMessage());
            // Fallback logic could go here
            return null;
        }
    }
}
""")

create_file("backend/src/main/java/com/janseva/service/GrievanceService.java", """
package com.janseva.service;
import com.janseva.dto.CreateGrievanceRequest;
import com.janseva.dto.AiAnalysisResponse;
import com.janseva.entity.Grievance;
import com.janseva.entity.TimelineEvent;
import com.janseva.repository.GrievanceRepository;
import com.janseva.repository.TimelineEventRepository;
import org.springframework.stereotype.Service;
import java.util.UUID;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.List;

@Service
public class GrievanceService {
    private final GrievanceRepository repo;
    private final TimelineEventRepository timelineRepo;
    private final AiClientService aiClient;
    private final EncryptionService encryption;
    
    private final SecureRandom random = new SecureRandom();

    public GrievanceService(GrievanceRepository repo, TimelineEventRepository timelineRepo, AiClientService aiClient, EncryptionService encryption) {
        this.repo = repo;
        this.timelineRepo = timelineRepo;
        this.aiClient = aiClient;
        this.encryption = encryption;
    }

    public Grievance create(UUID citizenId, CreateGrievanceRequest req) {
        Grievance g = new Grievance();
        g.citizenId = citizenId;
        g.trackingCode = "JSV-" + String.format("%06d", random.nextInt(999999));
        g.status = "RECEIVED";
        g.priority = "NORMAL";
        if(req.latitude != null && req.longitude != null) {
            g.publicLatitude = BigDecimal.valueOf(req.latitude).setScale(2, java.math.RoundingMode.HALF_UP);
            g.publicLongitude = BigDecimal.valueOf(req.longitude).setScale(2, java.math.RoundingMode.HALF_UP);
            try {
                g.exactLocationCipher = encryption.encrypt(req.latitude + "," + req.longitude);
            } catch (Exception e) { e.printStackTrace(); }
        }
        g = repo.save(g);
        
        TimelineEvent t = new TimelineEvent();
        t.grievanceId = g.id;
        t.actorId = citizenId;
        t.eventType = "CREATED";
        t.newStatus = "RECEIVED";
        timelineRepo.save(t);
        return g;
    }

    public AiAnalysisResponse analyze(UUID grievanceId, String text) {
        AiAnalysisResponse res = aiClient.analyzeGrievance(grievanceId.toString(), text);
        if(res != null) {
            Grievance g = repo.findById(grievanceId).orElseThrow();
            g.departmentCode = res.departmentCode;
            g.taxonomyCode = res.taxonomyCode;
            g.confidence = BigDecimal.valueOf(res.confidence);
            g.priority = res.priority;
            
            if ("AUTO_ROUTE".equals(res.decision)) {
                g.status = "ROUTED";
            } else {
                g.status = "PENDING_REVIEW";
            }
            repo.save(g);
            
            TimelineEvent t = new TimelineEvent();
            t.grievanceId = g.id;
            t.eventType = "ANALYZED";
            t.newStatus = g.status;
            timelineRepo.save(t);
        }
        return res;
    }
    
    public List<Grievance> getMine(UUID citizenId) {
        return repo.findByCitizenId(citizenId);
    }
}
""")

create_file("backend/src/main/java/com/janseva/repository/TimelineEventRepository.java", """
package com.janseva.repository;
import com.janseva.entity.TimelineEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface TimelineEventRepository extends JpaRepository<TimelineEvent, UUID> {
    List<TimelineEvent> findByGrievanceId(UUID grievanceId);
}
""")

create_file("backend/src/main/java/com/janseva/controller/GrievanceController.java", """
package com.janseva.controller;
import com.janseva.dto.CreateGrievanceRequest;
import com.janseva.dto.AiAnalysisResponse;
import com.janseva.entity.Grievance;
import com.janseva.entity.TimelineEvent;
import com.janseva.service.GrievanceService;
import com.janseva.repository.TimelineEventRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/grievances")
public class GrievanceController {
    private final GrievanceService service;
    private final TimelineEventRepository timelineRepo;
    public GrievanceController(GrievanceService service, TimelineEventRepository timelineRepo) { 
        this.service = service; 
        this.timelineRepo = timelineRepo;
    }

    @PostMapping
    public Grievance create(Authentication auth, @Valid @RequestBody CreateGrievanceRequest req) {
        return service.create(UUID.fromString(auth.getName()), req);
    }

    @GetMapping("/mine")
    public List<Grievance> getMine(Authentication auth) {
        return service.getMine(UUID.fromString(auth.getName()));
    }
    
    @PostMapping("/{id}/analyze")
    public AiAnalysisResponse analyze(Authentication auth, @PathVariable UUID id, @RequestBody java.util.Map<String, String> body) {
        return service.analyze(id, body.get("text"));
    }
    
    @GetMapping("/{id}/timeline")
    public List<TimelineEvent> getTimeline(Authentication auth, @PathVariable UUID id) {
        // Assume citizen ownership check is done here (MVP mock)
        return timelineRepo.findByGrievanceId(id);
    }
}
""")

create_file("backend/src/main/java/com/janseva/controller/StaffController.java", """
package com.janseva.controller;
import com.janseva.entity.Grievance;
import com.janseva.repository.GrievanceRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/staff")
public class StaffController {
    private final GrievanceRepository repo;
    public StaffController(GrievanceRepository repo) { this.repo = repo; }

    @GetMapping("/grievances")
    public List<Grievance> list(Authentication auth) {
        // MVP: returning all, should filter by dept
        return repo.findAll();
    }
}
""")

print("Phase 3 Java scaffolded.")
