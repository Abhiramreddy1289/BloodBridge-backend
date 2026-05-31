const appUrl = () => process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5173';

const renderEmail = ({ title, preheader, sections = [], cta }) => {
  const text = [
    title,
    preheader,
    ...sections.flatMap((section) => [
      '',
      section.heading,
      ...section.lines,
    ]),
    cta ? ['', `${cta.label}: ${cta.url}`] : '',
    '',
    'BloodBridge Team',
  ].filter(Boolean).join('\n');

  const html = `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;padding:28px;">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
          <div style="background:#991b1b;padding:24px 28px;color:#ffffff;">
            <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">BloodBridge</p>
            <h1 style="margin:0;font-size:26px;line-height:1.25;">${escapeHtml(title)}</h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 22px;color:#475569;font-size:16px;line-height:1.6;font-weight:bold;">${escapeHtml(preheader)}</p>
            ${sections.map((section) => `
              <div style="margin:22px 0;padding:18px;border:1px solid #f1f5f9;border-radius:14px;background:#f8fafc;">
                <h2 style="margin:0 0 12px;font-size:16px;color:#111827;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">${escapeHtml(section.heading)}</h2>
                ${section.lines.map((line) => `<p style="margin:7px 0;color:#475569;font-size:14px;line-height:1.5;">${escapeHtml(line)}</p>`).join('')}
              </div>
            `).join('')}
            ${cta ? `
              <div style="margin-top:25px;text-align:left;">
                <a href="${escapeAttribute(cta.url)}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:12px;font-weight:700;box-shadow:0 4px 6px -1px rgba(220,38,38,0.2);">
                  ${escapeHtml(cta.label)}
                </a>
              </div>
            ` : ''}
            <p style="margin:28px 0 0;color:#64748b;font-size:12px;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:14px;">
              You received this email because your BloodBridge account is registered to this email address. Thank you for being a vital part of our life-saving emergency response network.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  return { text, html };
};

const welcomeEmail = (user) => {
  const isHospital = user.role === 'hospital';
  return renderEmail({
    title: isHospital ? 'Welcome to the BloodBridge Hospital Network' : 'Welcome to BloodBridge',
    preheader: isHospital 
      ? `Hi ${user.name}, your hospital coordination profile has been verified.` 
      : `Hi ${user.name}, your ${user.bloodGroup} life-saving donor profile is officially active!`,
    sections: [
      {
        heading: isHospital ? 'Hospital Portal Activated' : 'Your Hero Profile Details',
        lines: isHospital 
          ? [
              `Institution Name: ${user.name}`,
              `Registered City: ${user.city || 'Not specified'}`,
              `Registered State: ${user.state || 'Not specified'}`,
              `Contact Number: ${user.phone}`,
              'As a partner hospital, you can now manage your live blood inventories, create critical emergency blood requests, and coordinate community donation camps to maintain healthy reserves.',
            ]
          : [
              `Donor Name: ${user.name}`,
              `Blood Group: ${user.bloodGroup}`,
              `Location: ${user.city || 'Not specified'}, ${user.state || 'Not specified'}`,
              `Initial Reliability Score: ${user.reliabilityScore || 80}%`,
              'Your willingness to donate is a beacon of hope. Please keep your availability status and location up to date so nearby emergency SOS alerts can reach you in real-time.',
            ],
      },
      {
        heading: 'Important Next Steps',
        lines: isHospital
          ? [
              '1. Access your dashboard and navigate to the Logistics page.',
              '2. Set your initial real-time blood group quantities under the Live Inventory tab.',
              '3. Review incoming donor responses to coordinate smooth blood transfers.',
            ]
          : [
              '1. Log into your account and review the live Emergency Requests dashboard.',
              '2. If you accept a request, prompt travel is crucial as patients rely on your estimated time of arrival (ETA).',
              '3. Donating successfully boosts your Reliability Score, making you a trusted responder.',
            ]
      }
    ],
    cta: { 
      label: isHospital ? 'Update Live Inventory' : 'View Emergency Requests', 
      url: isHospital ? `${appUrl()}/inventory` : `${appUrl()}/dashboard` 
    },
  });
};

const loginEmail = (user) => renderEmail({
  title: 'Secure Account Access Detected',
  preheader: `Hello ${user.name}, a new login was recorded for your BloodBridge account.`,
  sections: [
    {
      heading: 'Login Security Details',
      lines: [
        `Account Registered Email: ${user.email}`,
        `Account Type/Role: ${user.role.toUpperCase()}`,
        `Access Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
        'Our security systems successfully verified this login session. If this was you, no action is required.',
      ],
    },
    {
      heading: 'Did not recognize this activity?',
      lines: [
        'If you did not authorize this login, your account password may have been compromised.',
        'Please immediately log in to your profile, change your password to a strong and unique value, and notify the BloodBridge emergency admin support team.',
      ]
    }
  ],
  cta: { label: 'Go to Security Profile', url: `${appUrl()}/profile` },
});

const campEmail = (camp, type = 'new') => {
  const isToday = type === 'today';
  const isSubmitted = type === 'submitted';
  
  let title = 'New Voluntary Blood Drive Announced';
  let preheader = `A new blood donation camp "${camp.title}" has been scheduled.`;
  let statusExplanation = 'A new community donation camp has been registered on BloodBridge. Join us to make a direct life-saving contribution!';
  
  if (isToday) {
    title = '🚨 Blood Donation Camp Happening Today!';
    preheader = `The drive "${camp.title}" is officially live today.`;
    statusExplanation = 'This camp is scheduled for today! Please visit the venue and encourage friends and family to join. Every single donation counts.';
  } else if (isSubmitted) {
    title = 'Camp Submission Received';
    preheader = `Your drive "${camp.title}" has been submitted for verification.`;
    statusExplanation = 'Thank you for organizing! Your donation camp registration has been received and is currently under administrative review. We will notify you as soon as it is approved.';
  }

  return renderEmail({
    title,
    preheader,
    sections: [
      {
        heading: 'Event Overview',
        lines: [
          `Camp Title: ${camp.title}`,
          `Organized By: ${camp.organiser}`,
          `Date & Timing: ${new Date(camp.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}`,
          `Venue Address: ${camp.location}`,
          `Coordinator Phone: ${camp.phone}`,
        ],
      },
      {
        heading: 'Action Status',
        lines: [
          statusExplanation,
          'Donating blood at a verified camp is safe, quick, and helps replenish vital local hospital reserves.',
        ]
      }
    ],
    cta: { label: 'Explore Active Camps', url: `${appUrl()}/camps` },
  });
};

const requestAlertEmail = ({ donor, request }) => renderEmail({
  title: '🚨 CRITICAL SOS: Emergency Donor Needed!',
  preheader: `Hi ${donor.name}, a patient urgently needs your matching ${request.bloodGroup} blood type.`,
  sections: [
    {
      heading: 'Emergency Case Summary',
      lines: [
        `Urgency Level: ${request.urgencyLevel.toUpperCase()}`,
        `Required Blood Group: ${request.bloodGroup}`,
        `Quantity Requested: ${request.unitsRequired} Units`,
        `Hospital Venue: ${request.hospitalName}`,
        `Hospital Address: ${request.hospitalAddress}, ${request.city}`,
        `Patient Name: ${request.patientName}`,
      ],
    },
    {
      heading: 'Your Action Matters Now',
      lines: [
        'An emergency coordinator has verified this critical request. As a compatible matching donor, your timely action is vital.',
        'If you are feeling healthy and fit to donate, please accept this request through your dashboard immediately to share your contact details and estimated arrival time.',
      ]
    }
  ],
  cta: { label: 'Respond to Emergency', url: `${appUrl()}/requests/${request._id}` },
});

const requestStatusEmail = ({ user, request, status }) => {
  let title = 'Emergency Request Updated';
  let preheader = `Your request for ${request.bloodGroup} blood is updated.`;
  let headerText = 'Latest Status Update';
  let descriptionLines = [];

  if (status === 'created') {
    title = 'Emergency SOS Alert Active';
    preheader = `Your request for ${request.bloodGroup} blood has been broadcasted.`;
    headerText = 'Request Broadcast Successful';
    descriptionLines = [
      `We have successfully processed and validated your emergency SOS request for ${request.unitsRequired} units of ${request.bloodGroup} blood at ${request.hospitalName}.`,
      'Our live system has immediately notified all verified, matching donors in your vicinity.',
      'We are monitoring responses in real-time. You will be notified the second a donor accepts your request.'
    ];
  } else if (status === 'on_the_way') {
    const isDonorEmail = user.role === 'donor';
    if (isDonorEmail) {
      title = 'Thank You for Accepting the SOS';
      preheader = `Your route to ${request.hospitalName} is ready.`;
      headerText = 'Mission: Life-Saving Donation';
      descriptionLines = [
        `You have promised to donate ${request.bloodGroup} blood for patient ${request.patientName}.`,
        `Destination: ${request.hospitalName} (${request.hospitalAddress}, ${request.city})`,
        `Your declared Estimated Time of Arrival (ETA): ${request.donorETA} minutes.`,
        'Please travel safely. The patient and hospital staff have been notified and are eagerly waiting for your arrival. Thank you for your noble gesture!'
      ];
    } else {
      title = '🚨 Life-Saving Donor On The Way!';
      preheader = 'A matching donor has accepted your emergency request!';
      headerText = 'Donor Route In Progress';
      descriptionLines = [
        `Excellent news! A verified matching donor has accepted your request for ${request.bloodGroup} blood at ${request.hospitalName}.`,
        `Donor's Estimated Time of Arrival (ETA): ${request.donorETA} minutes.`,
        `Donor Contact Number: ${request.contactNumber}`,
        'Please ensure your coordination staff is ready at the hospital desk to receive the donor.'
      ];
    }
  } else if (status === 'arrived') {
    const isDonorEmail = user.role === 'donor';
    if (isDonorEmail) {
      title = 'Arrival Registered';
      preheader = `We've marked your arrival at ${request.hospitalName}.`;
      headerText = 'Safe Arrival Confirmed';
      descriptionLines = [
        `Thank you for arriving safely at ${request.hospitalName}.`,
        'Please proceed to the blood bank registration desk, mention your name and the patient ID to proceed with the donation.',
        'Once the donation is completed, the requester will close the ticket.'
      ];
    } else {
      title = 'Donor Has Arrived at Venue';
      preheader = 'Your matching donor is now at the hospital!';
      headerText = 'Ready to Donate';
      descriptionLines = [
        `Your scheduled donor has officially marked their physical arrival at ${request.hospitalName}.`,
        `Please meet the donor immediately and coordinate the extraction. Contact: ${request.contactNumber}`,
        'Once the donation is successfully completed, please log into your dashboard to mark this request as "Completed".'
      ];
    }
  } else if (status === 'completed') {
    const isDonorEmail = user.role === 'donor';
    if (isDonorEmail) {
      title = 'Heroism Acknowledged: Life Saved! 🎉';
      preheader = `Thank you for donating ${request.bloodGroup} blood.`;
      headerText = 'Direct Impact Registered';
      descriptionLines = [
        'You have successfully completed your blood donation! Because of you, a patient received timely medical support.',
        'As a token of appreciation for your reliability:',
        '- Your donor Reliability Score has been increased by +2%.',
        '- Your next eligible availability timeline has been updated.',
        'The entire BloodBridge community salutes your selfless service!'
      ];
    } else {
      title = 'Emergency SOS Fulfilled successfully';
      preheader = 'Your emergency blood request is complete.';
      headerText = 'Successful Coordination';
      descriptionLines = [
        `Your emergency request for ${request.unitsRequired} units of ${request.bloodGroup} has been successfully fulfilled.`,
        'We hope the patient is recovering well.',
        'Please consider sharing your story on our Community Stories page to inspire others to donate.'
      ];
    }
  } else if (status === 'cancelled') {
    title = 'Blood Request Cancelled';
    preheader = `The request for ${request.bloodGroup} blood was marked as cancelled.`;
    headerText = 'Request Closed/Cancelled';
    descriptionLines = [
      `The active blood request for patient ${request.patientName} at ${request.hospitalName} has been closed or cancelled.`,
      'If you were an assigned donor, you are now released back into the active pool of available donors.',
      'Thank you for your understanding and ongoing support.'
    ];
  } else {
    descriptionLines = [
      `The active blood request has been updated to the status: "${status.toUpperCase()}".`,
      `Hospital: ${request.hospitalName}`,
      `Blood Group Required: ${request.bloodGroup}`,
    ];
  }

  return renderEmail({
    title,
    preheader,
    sections: [
      {
        heading: headerText,
        lines: descriptionLines,
      },
      {
        heading: 'Request Parameters',
        lines: [
          `Hospital Name: ${request.hospitalName}`,
          `Patient Target: ${request.patientName}`,
          `Blood Group: ${request.bloodGroup}`,
          `Location: ${request.city}`,
        ],
      }
    ],
    cta: { label: 'View Request Details', url: `${appUrl()}/requests/${request._id}` },
  });
};

const profileUpdateEmail = (user) => renderEmail({
  title: 'BloodBridge Profile Update Confirmed',
  preheader: `Hi ${user.name}, your account settings were successfully updated.`,
  sections: [
    {
      heading: 'Profile Summary',
      lines: [
        `Account Name: ${user.name}`,
        `Donor Status: ${user.availabilityStatus ? 'AVAILABLE - You can receive SOS emergency requests.' : 'UNAVAILABLE - You will not receive active distress calls.'}`,
        `Last Recorded Donation Date: ${user.lastDonationDate ? new Date(user.lastDonationDate).toLocaleDateString('en-IN') : 'None recorded'}`,
        'Keeping these parameters accurate ensures we only send emergency calls when you are fully ready to respond.',
      ],
    },
    {
      heading: 'Need to adjust your settings?',
      lines: [
        'You can change your availability toggles, update your geo-coordinates, or update contact info anytime from your profile control center.',
      ]
    }
  ],
  cta: { label: 'Manage Profile Settings', url: `${appUrl()}/profile` },
});

const inventoryUpdateEmail = (user) => renderEmail({
  title: 'Real-time Hospital Inventory Synced',
  preheader: `Hi ${user.name}, your real-time blood stock counts were successfully updated.`,
  sections: [
    {
      heading: 'Synced Inventory Reserves',
      lines: Object.entries(user.inventory || {}).map(([group, units]) => `• ${group} Group: ${units} units available`),
    },
    {
      heading: 'Why keeping stock current is crucial',
      lines: [
        'Accurate counts allow adjacent medical facilities, clinics, and emergency responders to view exact local reserves, ensuring optimal coordination and saving valuable hours.',
      ]
    }
  ],
  cta: { label: 'Go to Inventory Controls', url: `${appUrl()}/inventory` },
});

const storyEmail = (user) => renderEmail({
  title: 'Your Story is Shared with the World! 🌟',
  preheader: `Thank you ${user.name}, your life-saving testimonial was submitted successfully.`,
  sections: [
    {
      heading: 'Spreading the Inspiration',
      lines: [
        'Thank you so much for taking the time to share your emergency coordination or donation experience with the BloodBridge community.',
        'Personal testimonials are the single most powerful driver in motivating new volunteers to sign up and donate during critical emergency requests.',
      ],
    },
    {
      heading: 'What happens next',
      lines: [
        'Our community managers have published your story to the community wall.',
        'You can view your submission alongside dozens of other inspiring stories on our testimonials page now.',
      ]
    }
  ],
  cta: { label: 'Explore Community Stories', url: `${appUrl()}/stories` },
});

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const escapeAttribute = escapeHtml;

module.exports = {
  welcomeEmail,
  loginEmail,
  campEmail,
  requestAlertEmail,
  requestStatusEmail,
  profileUpdateEmail,
  inventoryUpdateEmail,
  storyEmail,
};
