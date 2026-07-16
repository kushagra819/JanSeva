package com.janseva.service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class EncryptionService {
    @Value("${janseva.security.encryption-key}")
    private String encryptionKey;

    public String encrypt(String plainText) throws Exception {
        if(plainText == null) return null;
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        byte[] nonce = new byte[12];
        new SecureRandom().nextBytes(nonce);
        GCMParameterSpec spec = new GCMParameterSpec(128, nonce);
        SecretKeySpec key = new SecretKeySpec(encryptionKey.getBytes(), "AES");
        cipher.init(Cipher.ENCRYPT_MODE, key, spec);
        byte[] cipherText = cipher.doFinal(plainText.getBytes());
        byte[] encrypted = new byte[nonce.length + cipherText.length];
        System.arraycopy(nonce, 0, encrypted, 0, nonce.length);
        System.arraycopy(cipherText, 0, encrypted, nonce.length, cipherText.length);
        return "v1:" + Base64.getEncoder().encodeToString(encrypted);
    }
    
    public String decrypt(String cipherText) throws Exception {
        if(cipherText == null) return null;
        String[] parts = cipherText.split(":");
        byte[] decoded = Base64.getDecoder().decode(parts[1]);
        byte[] nonce = new byte[12];
        System.arraycopy(decoded, 0, nonce, 0, 12);
        GCMParameterSpec spec = new GCMParameterSpec(128, nonce);
        SecretKeySpec key = new SecretKeySpec(encryptionKey.getBytes(), "AES");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, spec);
        byte[] plainText = cipher.doFinal(decoded, 12, decoded.length - 12);
        return new String(plainText);
    }
}
