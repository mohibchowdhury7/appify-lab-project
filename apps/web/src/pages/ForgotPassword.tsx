import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AXIOS_INSTANCE } from '../api/axios-instance';

import logoImg from '../assets/images/logo.svg';
import shape1 from '../assets/images/shape1.svg';
import shape2 from '../assets/images/shape2.svg';
import shape3 from '../assets/images/shape3.svg';
import darkShape from '../assets/images/dark_shape.svg';
import darkShape1 from '../assets/images/dark_shape1.svg';
import darkShape2 from '../assets/images/dark_shape2.svg';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      await AXIOS_INSTANCE.post('/api/auth/forgot-password', { email });
      setMessage('If that email is registered, a reset token has been generated. Check the API console output for the token (dev mode).');
      setStep('reset');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      await AXIOS_INSTANCE.post('/api/auth/reset-password', { token, password: newPassword });
      setMessage('Password reset successful! You can now log in.');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Reset failed';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="_social_login_wrapper _layout_main_wrapper">
      <div className="_shape_one">
        <img src={shape1} alt="" className="_shape_img" />
        <img src={darkShape} alt="" className="_dark_shape" />
      </div>
      <div className="_shape_two">
        <img src={shape2} alt="" className="_shape_img" />
        <img src={darkShape1} alt="" className="_dark_shape _dark_shape_opacity" />
      </div>
      <div className="_shape_three">
        <img src={shape3} alt="" className="_shape_img" />
        <img src={darkShape2} alt="" className="_dark_shape _dark_shape_opacity" />
      </div>
      <div className="_social_login_wrap">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
              <div className="_social_login_content">
                <div className="_social_login_left_logo _mar_b28">
                  <img src={logoImg} alt="Buddy Script" className="_left_logo" />
                </div>
                <h4 className="_social_login_content_title _titl4 _mar_b30">Forgot Password</h4>

                {step === 'request' ? (
                  <form className="_social_login_form" onSubmit={handleRequest}>
                    <div className="row">
                      <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                        <div className="_social_login_form_input _mar_b14">
                          <label className="_social_login_label _mar_b8">Email</label>
                          <input
                            type="email"
                            className="form-control _social_login_input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    {error && (
                      <div className="row" style={{ marginBottom: '14px' }}>
                        <div className="col-12">
                          <p style={{ color: '#dc3545', fontSize: '14px' }}>{error}</p>
                        </div>
                      </div>
                    )}
                    {message && (
                      <div className="row" style={{ marginBottom: '14px' }}>
                        <div className="col-12">
                          <p style={{ color: '#198754', fontSize: '14px' }}>{message}</p>
                        </div>
                      </div>
                    )}
                    <div className="row">
                      <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
                        <div className="_social_login_form_btn _mar_t40 _mar_b60">
                          <button type="submit" className="_social_login_form_btn_link _btn1" disabled={submitting}>
                            {submitting ? 'Sending...' : 'Send Reset Link'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                ) : (
                  <form className="_social_login_form" onSubmit={handleReset}>
                    <div className="row">
                      <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                        <div className="_social_login_form_input _mar_b14">
                          <label className="_social_login_label _mar_b8">Reset Token</label>
                          <input
                            type="text"
                            className="form-control _social_login_input"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                        <div className="_social_login_form_input _mar_b14">
                          <label className="_social_login_label _mar_b8">New Password</label>
                          <input
                            type="password"
                            className="form-control _social_login_input"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={8}
                          />
                        </div>
                      </div>
                    </div>
                    {error && (
                      <div className="row" style={{ marginBottom: '14px' }}>
                        <div className="col-12">
                          <p style={{ color: '#dc3545', fontSize: '14px' }}>{error}</p>
                        </div>
                      </div>
                    )}
                    {message && (
                      <div className="row" style={{ marginBottom: '14px' }}>
                        <div className="col-12">
                          <p style={{ color: '#198754', fontSize: '14px' }}>{message}</p>
                        </div>
                      </div>
                    )}
                    <div className="row">
                      <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
                        <div className="_social_login_form_btn _mar_t40 _mar_b60">
                          <button type="submit" className="_social_login_form_btn_link _btn1" disabled={submitting}>
                            {submitting ? 'Resetting...' : 'Reset Password'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}

                <div className="row">
                  <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                    <div className="_social_login_bottom_txt">
                      <p className="_social_login_bottom_txt_para">
                        <Link to="/login">Back to Login</Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
